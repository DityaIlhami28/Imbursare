import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ApprovalStatus, CompanyRole, Employee, ExpenseStatus, OcrStatus } from '@prisma/client';
import { uploadToR2, getSignedFileUrl } from '@/storage/upload.service';
import { r2 } from '@/storage/r2.service';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

/// Allowed slack between the declared amount and the OCR-scanned receipt total
/// before a submit is blocked. Only over-claiming beyond this is rejected.
const OCR_TOLERANCE = 0.05;

export interface ExpenseListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string; // ExpenseStatus value, or 'ALL'/undefined for no status filter
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  statusCounts: Record<string, number>;
  statusSums: Record<string, number>;
}

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(private prisma: PrismaService) {}

  private async checkUserAuthorization(userId: string, companyId?: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        companyId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not authorized');
    }

    return membership;
  }

  /// Rolls a set of per-receipt OCR statuses up into one expense-level flag for
  /// list views. Worst case wins (INVALID > UNVERIFIED > VALID); returns null when
  /// nothing has been stamped yet (e.g. legacy expenses predating OCR validation).
  private aggregateOcr(statuses: (OcrStatus | null)[]): OcrStatus | null {
    const known = statuses.filter((s): s is OcrStatus => s !== null);
    if (known.length === 0) return null;
    if (known.includes(OcrStatus.INVALID)) return OcrStatus.INVALID;
    if (known.includes(OcrStatus.UNVERIFIED)) return OcrStatus.UNVERIFIED;
    return OcrStatus.VALID;
  }

  /// Resolves the requestor's display name for a set of expense authors. Maps each
  /// userId to that person's Employee.fullName within the company, in one query.
  private async requestorNameMap(companyId: string, userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const employees = await this.prisma.employee.findMany({
      where: { companyId, userId: { in: unique } },
      select: { userId: true, fullName: true },
    });
    return new Map(employees.map((e) => [e.userId, e.fullName]));
  }

  /// Case-insensitive search over an expense's title / number. Returns {} when the
  /// search term is empty so it can be spread into any `where` clause safely.
  private expenseSearchWhere(search?: string) {
    const q = search?.trim();
    if (!q) return {};
    return {
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { expenseNumber: { contains: q, mode: 'insensitive' as const } },
      ],
    };
  }

  /// Normalises an incoming status query param to a real ExpenseStatus, or undefined
  /// for 'ALL'/empty/invalid (so it's simply not applied as a filter).
  private normaliseStatus(status?: string): ExpenseStatus | undefined {
    if (!status || status === 'ALL') return undefined;
    return (Object.values(ExpenseStatus) as string[]).includes(status)
      ? (status as ExpenseStatus)
      : undefined;
  }

  private pagingArgs(query: ExpenseListQuery): { skip: number | undefined; take: number | undefined } {
    const { page, pageSize } = query;
    if (!page || !pageSize || page < 1 || pageSize < 1) return { skip: undefined, take: undefined };
    return { skip: (page - 1) * pageSize, take: pageSize };
  }

  /// One groupBy gives per-status counts and amount sums for the filter cards, plus
  /// the row total for the active status filter (or the grand total for 'ALL').
  private async expenseAggregates(scopeWhere: object, status: ExpenseStatus | undefined) {
    const grouped = await this.prisma.expense.groupBy({
      by: ['status'],
      where: scopeWhere,
      _count: { _all: true },
      _sum: { amount: true },
    });
    const statusCounts: Record<string, number> = {};
    const statusSums: Record<string, number> = {};
    for (const g of grouped) {
      statusCounts[g.status] = g._count._all;
      statusSums[g.status] = g._sum.amount ?? 0;
    }
    const total = status
      ? statusCounts[status] ?? 0
      : grouped.reduce((s, g) => s + g._count._all, 0);
    return { statusCounts, statusSums, total };
  }

  /// Within-company access control for a single expense. Cross-company access is
  /// already blocked by scoping queries with companyId; this narrows visibility to
  /// the people with a legitimate reason to see it: the owner, any ADMIN, FINANCE in
  /// the same unit, or the expense's assigned approver.
  private async assertCanViewExpense(
    expense: { id: string; userId: string; unit: string | null },
    role: CompanyRole,
    userId: string,
    companyId: string,
  ) {
    if (expense.userId === userId) return; // owner
    if (role === CompanyRole.ADMIN) return; // admin sees everything in the company

    if (role === CompanyRole.FINANCE) {
      const finance = await this.prisma.employee.findFirst({
        where: { userId, companyId },
        select: { unit: true },
      });
      if (finance?.unit && finance.unit === expense.unit) return;
    }

    const approval = await this.prisma.expenseApproval.findFirst({
      where: { expenseId: expense.id },
      select: { approverId: true },
    });
    if (approval) {
      const approver = await this.prisma.employee.findFirst({
        where: { id: approval.approverId, userId, companyId },
        select: { id: true },
      });
      if (approver) return; // assigned approver
    }

    throw new ForbiddenException('You are not allowed to view this expense');
  }

  async getMyExpenses(userId: string, companyId: string, query: ExpenseListQuery = {}) {
    await this.checkUserAuthorization(userId, companyId);
    const status = this.normaliseStatus(query.status);
    const scopeWhere = { userId, companyId, ...this.expenseSearchWhere(query.search) };
    const { statusCounts, statusSums, total } = await this.expenseAggregates(scopeWhere, status);

    const rows = await this.prisma.expense.findMany({
      where: status ? { ...scopeWhere, status } : scopeWhere,
      orderBy: { createdAt: 'desc' },
      ...this.pagingArgs(query),
    });
    const data = rows.map((expense) => ({
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      title: expense.title,
      amount: expense.amount,
      status: expense.status,
      createdAt: expense.createdAt,
    }));
    return { data, total, statusCounts, statusSums };
  }

  async getCompanyExpensesForAdmin(userId: string, companyId: string, query: ExpenseListQuery = {}) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if (membership.role !== CompanyRole.ADMIN) {
      throw new ForbiddenException('You are not authorized');
    }
    const status = this.normaliseStatus(query.status);
    const scopeWhere = { companyId, ...this.expenseSearchWhere(query.search) };
    const { statusCounts, statusSums, total } = await this.expenseAggregates(scopeWhere, status);

    const expenses = await this.prisma.expense.findMany({
      where: status ? { ...scopeWhere, status } : scopeWhere,
      include: {
        attachments: { select: { ocrStatus: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...this.pagingArgs(query),
    });
    const names = await this.requestorNameMap(companyId, expenses.map((e) => e.userId));
    const data = expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      title: e.title,
      amount: e.amount,
      status: e.status,
      unit: e.unit,
      createdAt: e.createdAt,
      userId: e.userId,
      companyId: e.companyId,
      requestedBy: names.get(e.userId) ?? e.user.email,
      ocrFlag: this.aggregateOcr(e.attachments.map((a) => a.ocrStatus)),
    }));
    return { data, total, statusCounts, statusSums };
  }

  async getCompanyExpensesForFinance(userId: string, companyId: string, query: ExpenseListQuery = {}) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if (membership.role !== CompanyRole.FINANCE) {
      throw new ForbiddenException('You are not authorized');
    }
    const checkUnit = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!checkUnit || !checkUnit.unit) {
      throw new BadRequestException('Unit not found for this user');
    }

    // Finance only ever sees APPROVED/REIMBURSED — clamp the status filter to that
    // subset so a crafted param can't surface DRAFT/SUBMIT rows.
    const allowed: ExpenseStatus[] = [ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED];
    const normalised = this.normaliseStatus(query.status);
    const status = normalised && allowed.includes(normalised) ? normalised : undefined;
    const scopeWhere = {
      unit: checkUnit.unit,
      companyId,
      status: { in: allowed },
      ...this.expenseSearchWhere(query.search),
    };
    const { statusCounts, statusSums, total } = await this.expenseAggregates(scopeWhere, status);

    const expenses = await this.prisma.expense.findMany({
      where: status ? { ...scopeWhere, status } : scopeWhere,
      include: {
        attachments: { select: { ocrStatus: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...this.pagingArgs(query),
    });
    const names = await this.requestorNameMap(companyId, expenses.map((e) => e.userId));
    const data = expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      title: e.title,
      amount: e.amount,
      status: e.status,
      createdAt: e.createdAt,
      requestedBy: names.get(e.userId) ?? e.user.email,
      ocrFlag: this.aggregateOcr(e.attachments.map((a) => a.ocrStatus)),
    }));
    return { data, total, statusCounts, statusSums };
  }

  async addExpense(
    dto: CreateExpenseDto,
    userId: string,
    companyId: string,
    files?: Express.Multer.File[],
  ) {
    await this.checkUserAuthorization(userId, companyId);
    if (!files || files.length === 0) throw new BadRequestException('At least one attachment is required');
    const amount = typeof dto.amount === 'number' ? dto.amount : Number(dto.amount);

    const categoryRecord = await this.prisma.category.findFirst({
      where: { name: dto.category, companyId: companyId },
    });
    if (!categoryRecord) {
      throw new BadRequestException('Category not found');
    }
    const checkEmployee = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!checkEmployee) {
      throw new BadRequestException('Employee not found');
    }
    if (!checkEmployee.unit) {
      throw new BadRequestException('Unit not found');
    }

    const expense = await this.prisma.expense.create({
      data: {
        amount: amount,
        description: dto.description ?? '',
        title: dto.title ?? '',
        userId: userId,
        companyId: companyId,
        categoryId: categoryRecord.id,
        unit: checkEmployee.unit,
      },
    });

    if (files && files.length > 0) {
      files.forEach((file) => {
        if (file.size > 4 * 1024 * 1024) {
          throw new BadRequestException('File size should be less than 4MB');
        }
        const IsImage = file.mimetype.startsWith('image/');
        const IsPdf = file.mimetype === 'application/pdf';
        const IsDocx =
          file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!IsImage && !IsPdf && !IsDocx) {
          throw new BadRequestException(
            `File ${file.originalname} has an invalid type. Only images, PDFs, and Word documents are allowed`,
          );
        }
      });
      const uploaded = await Promise.all(files.map((file) => uploadToR2(file)));

      await this.prisma.expenseAttachment.createMany({
        data: uploaded.map((file, i) => ({
          expenseId: expense.id,
          fileName: files[i].originalname,
          fileUrl: file.url,
          fileType: files[i].mimetype,
          size: files[i].size,
        })),
      });
    }

    await this.prisma.expenseLog.create({
      data: {
        expenseId: expense.id,
        action: expense.status,
        message: `Expense created to draft`,
        createdById: userId,
      },
    });

    return {
      message: 'Expense created successfully',
      expenseId: expense.id,
      status: expense.status,
    };
  }

  async getExpenseDetails(expenseId: string, userId: string, companyId: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    const expenseDetails = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        companyId,
      },
      include: {
        attachments: true,
        category: true,
      },
    });
    if (!expenseDetails) {
      throw new BadRequestException('Expense not found');
    }
    await this.assertCanViewExpense(expenseDetails, membership.role, userId, companyId);
    const attachments = await Promise.all(
      (expenseDetails.attachments ?? []).map(async (attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: await getSignedFileUrl(attachment.fileUrl),
        fileType: attachment.fileType,
        size: attachment.size,
        ocrStatus: attachment.ocrStatus,
        ocrAmount: attachment.ocrAmount,
      })),
    );
    return {
      id: expenseDetails.id,
      expenseNumber: expenseDetails.expenseNumber,
      title: expenseDetails.title,
      description: expenseDetails.description,
      amount: expenseDetails.amount,
      status: expenseDetails.status,
      attachments,
      category: expenseDetails.category
        ? {
            id: expenseDetails.category.id,
            name: expenseDetails.category.name,
          }
        : null,
      createdAt: expenseDetails.createdAt,
    };
  }

  async getExpenseLogs(expenseId: string, userId: string, companyId: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      select: { id: true, userId: true, unit: true },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    await this.assertCanViewExpense(expense, membership.role, userId, companyId);

    const logs = await this.prisma.expenseLog.findMany({
      where: {
        expenseId,
      },
      orderBy: { createdAt: 'asc' },
    });
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      message: log.message,
      createdById: log.createdById,
      createdAt: log.createdAt,
    }));
  }

  async updateExpenseData(
    expenseId: string,
    dto: UpdateExpenseDto,
    userId: string,
    companyId: string,
    files?: Express.Multer.File[],
    removeAttachmentIds?: string[],
  ) {
    await this.checkUserAuthorization(userId, companyId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId, companyId },
    });
    if (!expense) {
      throw new BadRequestException('Expense not found');
    }
    if (expense.status !== ExpenseStatus.DRAFT && expense.status !== ExpenseStatus.REVISION) {
      throw new BadRequestException('Only DRAFT or REVISION expenses can be edited');
    }

    // Handle attachment removals
    if (removeAttachmentIds && removeAttachmentIds.length > 0) {
      const toRemove = await this.prisma.expenseAttachment.findMany({
        where: { id: { in: removeAttachmentIds }, expenseId },
      });

      const existingCount = await this.prisma.expenseAttachment.count({ where: { expenseId } });
      const finalCount = existingCount - toRemove.length + (files?.length ?? 0);
      if (finalCount < 1) {
        throw new BadRequestException('At least one attachment is required');
      }

      const publicUrlBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
      await Promise.all(
        toRemove.map((att) => {
          const key = att.fileUrl.replace(`${publicUrlBase}/`, '');
          return r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
        }),
      );

      await this.prisma.expenseAttachment.deleteMany({
        where: { id: { in: toRemove.map((a) => a.id) }, expenseId },
      });
    }

    // Handle new file uploads
    if (files && files.length > 0) {
      files.forEach((file) => {
        if (file.size > 4 * 1024 * 1024) {
          throw new BadRequestException('File size should be less than 4MB');
        }
        const isImage = file.mimetype.startsWith('image/');
        const isPdf = file.mimetype === 'application/pdf';
        const isDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!isImage && !isPdf && !isDocx) {
          throw new BadRequestException(
            `File ${file.originalname} has an invalid type. Only images, PDFs, and Word documents are allowed`,
          );
        }
      });
      const uploaded = await Promise.all(files.map((file) => uploadToR2(file)));
      await this.prisma.expenseAttachment.createMany({
        data: uploaded.map((file, i) => ({
          expenseId,
          fileName: files[i].originalname,
          fileUrl: file.url,
          fileType: files[i].mimetype,
          size: files[i].size,
        })),
      });
    }

    const data: any = { ...dto };
    if (dto.amount !== undefined) {
      const parsedAmount = Number(dto.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
        throw new BadRequestException('Amount must be a positive number');
      }
      data.amount = parsedAmount;
    }
    if (dto.category) {
      const categoryRecord = await this.prisma.category.findFirst({
        where: { name: dto.category, companyId: expense.companyId },
      });
      if (!categoryRecord) {
        throw new BadRequestException('Category not found');
      }
      data.categoryId = categoryRecord.id;
      delete data.category;
    }

    return this.prisma.expense.update({
      where: { id: expenseId },
      data,
      include: {
        attachments: true,
        category: true,
      },
    });
  }

  async getPendingApprovals(userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);

    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!employee) return [];

    const approvals = await this.prisma.expenseApproval.findMany({
      where: { approverId: employee.id, status: ApprovalStatus.PENDING },
      include: {
        expense: {
          include: { category: true, user: true, attachments: { select: { ocrStatus: true } } },
        },
      },
      orderBy: { expense: { createdAt: 'desc' } },
    });

    const names = await this.requestorNameMap(companyId, approvals.map((a) => a.expense.userId));
    return approvals.map((a) => ({
      id: a.expense.id,
      title: a.expense.title,
      amount: a.expense.amount,
      status: a.expense.status,
      unit: a.expense.unit,
      category: a.expense.category
        ? { id: a.expense.category.id, name: a.expense.category.name }
        : null,
      expenseNumber: a.expense.expenseNumber,
      submittedBy: a.expense.user.email,
      requestedBy: names.get(a.expense.userId) ?? a.expense.user.email,
      createdAt: a.expense.createdAt,
      approvalNote: a.note ?? null,
      ocrFlag: this.aggregateOcr(a.expense.attachments.map((att) => att.ocrStatus)),
    }));
  }

  async forceRejectExpense(expenseId: string, userId: string, companyId: string, note: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if (membership.role !== CompanyRole.ADMIN)
      throw new ForbiddenException('Only ADMIN can force reject expenses');

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status === ExpenseStatus.REJECTED)
      throw new BadRequestException('Expense is already rejected');
    if (expense.status === ExpenseStatus.REIMBURSED)
      throw new BadRequestException('Cannot reject a reimbursed expense');
    if (!note?.trim())
      throw new BadRequestException('A reason is required for force rejection');

    const approval = await this.prisma.expenseApproval.findFirst({
      where: { expenseId },
    });

    await this.prisma.$transaction([
      ...(approval
        ? [this.prisma.expenseApproval.update({
            where: { id: approval.id },
            data: { status: ApprovalStatus.REJECTED, note },
          })]
        : []),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.REJECTED },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId,
          action: ExpenseStatus.REJECTED,
          message: `Force rejected by admin: ${note}`,
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Expense force rejected' };
  }

  async getAllApprovals(userId: string, companyId: string, query: ExpenseListQuery = {}) {
    await this.checkUserAuthorization(userId, companyId);

    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!employee) return { data: [], total: 0, statusCounts: {}, statusSums: {} };

    const status = this.normaliseStatus(query.status);
    const q = query.search?.trim();
    const expenseWhere = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { expenseNumber: { contains: q, mode: 'insensitive' as const } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {};

    // Per-status counts for the filter cards — fetch only the status of each matching
    // approval (search applied, status filter not) and tally in memory.
    const statusRows = await this.prisma.expenseApproval.findMany({
      where: { approverId: employee.id, expense: expenseWhere },
      select: { expense: { select: { status: true } } },
    });
    const statusCounts: Record<string, number> = {};
    for (const r of statusRows) {
      statusCounts[r.expense.status] = (statusCounts[r.expense.status] ?? 0) + 1;
    }
    const total = status ? statusCounts[status] ?? 0 : statusRows.length;

    const approvals = await this.prisma.expenseApproval.findMany({
      where: {
        approverId: employee.id,
        expense: status ? { ...expenseWhere, status } : expenseWhere,
      },
      include: {
        expense: {
          include: { category: true, user: true, attachments: { select: { ocrStatus: true } } },
        },
      },
      orderBy: { expense: { createdAt: 'desc' } },
      ...this.pagingArgs(query),
    });

    const names = await this.requestorNameMap(companyId, approvals.map((a) => a.expense.userId));
    const data = approvals.map((a) => ({
      id: a.expense.id,
      title: a.expense.title,
      amount: a.expense.amount,
      status: a.expense.status,
      unit: a.expense.unit,
      category: a.expense.category
        ? { id: a.expense.category.id, name: a.expense.category.name }
        : null,
      expenseNumber: a.expense.expenseNumber,
      submittedBy: a.expense.user.email,
      requestedBy: names.get(a.expense.userId) ?? a.expense.user.email,
      createdAt: a.expense.createdAt,
      approvalNote: a.note ?? null,
      ocrFlag: this.aggregateOcr(a.expense.attachments.map((att) => att.ocrStatus)),
    }));
    return { data, total, statusCounts, statusSums: {} };
  }

  async submitExpense(expenseId: string, userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, userId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.DRAFT && expense.status !== ExpenseStatus.REVISION)
      throw new BadRequestException('Only DRAFT or REVISION expenses can be submitted');

    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!employee) throw new BadRequestException('Employee record not found');
    if (!employee.positionId)
      throw new BadRequestException('You must have a position assigned before submitting an expense');

    const position = await this.prisma.position.findUnique({
      where: { id: employee.positionId },
    });
    if (!position) throw new BadRequestException('Position not found');

    const policy = await this.prisma.amountPolicy.findFirst({
      where: { companyId, level: position.level },
    });
    if (!policy)
      throw new BadRequestException('Amount policy not found for your position level');

    if (expense.amount > policy.maxAmount) {
      const formatted = 'Rp.' + policy.maxAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      throw new BadRequestException(`The Amount allowed for your position level is ${formatted}`);
    }

    const activeCount = await this.prisma.expense.count({
      where: { userId, status: { in: ['SUBMIT', 'APPROVED'] } },
    });
    if (activeCount >= policy.totalTransactions) {
      throw new BadRequestException(
        'You have reached the maximum number of transactions allowed for your position level please wait until your transactions are reviewed by Finance',
      );
    }

    // OCR receipt validation — reconcile the declared amount against the scanned
    // receipt total and stamp a per-receipt validation status. OCR/storage errors
    // are swallowed inside scanExpenseReceipts, so this never blocks on OCR being down.
    const { results: ocrResults, totalAmount: ocrTotal } = await this.scanExpenseReceipts(expenseId, companyId);
    if (ocrTotal !== null && expense.amount > ocrTotal * (1 + OCR_TOLERANCE)) {
      const fmt = (n: number) => 'Rp.' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      throw new BadRequestException(
        `Declared amount (${fmt(expense.amount)}) exceeds the scanned receipt total (${fmt(ocrTotal)}) by more than ${Math.round(OCR_TOLERANCE * 100)}%. Please correct the amount or attach the correct receipt.`,
      );
    }

    // Per-receipt status: VALID when recognised as a receipt (and the amount
    // reconciled above), INVALID when clearly not a receipt, UNVERIFIED when OCR
    // could not read it (unreadable, non-scannable file, or Groq unavailable).
    // Built as a factory so the ops can be rebuilt per transaction attempt —
    // PrismaPromises can't be reused across retries.
    const attachmentStatusUpdates = () =>
      ocrResults.map((r) => {
        const ocrStatus =
          r.isReceipt === true
            ? OcrStatus.VALID
            : r.isReceipt === false
              ? OcrStatus.INVALID
              : OcrStatus.UNVERIFIED;
        return this.prisma.expenseAttachment.update({
          where: { id: r.attachmentId },
          data: { ocrStatus, ocrAmount: r.amount },
        });
      });

    const validCount = ocrResults.filter((r) => r.isReceipt === true).length;
    const invalidCount = ocrResults.filter((r) => r.isReceipt === false).length;
    const unverifiedCount = ocrResults.length - validCount - invalidCount;
    const summaryParts: string[] = [];
    if (validCount) summaryParts.push(`${validCount} valid`);
    if (invalidCount) summaryParts.push(`${invalidCount} not recognised as receipt`);
    if (unverifiedCount) summaryParts.push(`${unverifiedCount} unverified`);
    const ocrSummary = summaryParts.length ? ` · Receipt check: ${summaryParts.join(', ')}` : '';

    if (expense.status === ExpenseStatus.DRAFT) {
      // First submission: find approver and create approval record
      let approverEmployee: Employee | null = null;
      if (employee.supervisorId) {
        approverEmployee = await this.prisma.employee.findUnique({
          where: { id: employee.supervisorId },
        });
      }
      if (!approverEmployee) {
        const adminMembership = await this.prisma.membership.findFirst({
          where: { companyId, role: CompanyRole.ADMIN },
        });
        if (adminMembership) {
          approverEmployee = await this.prisma.employee.findFirst({
            where: { userId: adminMembership.userId, companyId },
          });
        }
      }
      if (!approverEmployee)
        throw new BadRequestException('No approver found for this expense');

      const year = new Date().getFullYear();
      const unitSlug = (expense.unit ?? 'GEN')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Concurrent first-submissions in the same unit/year can race for the same
      // sequential number. The @@unique([companyId, expenseNumber]) constraint makes
      // the loser's transaction fail with P2002; recompute the count and retry.
      const MAX_ATTEMPTS = 5;
      for (let attempt = 1; ; attempt++) {
        const unitCount = await this.prisma.expense.count({
          where: {
            companyId,
            unit: expense.unit,
            expenseNumber: { not: null },
            createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
          },
        });
        const expenseNumber = `EXP/${unitSlug}/${year}/${String(unitCount + 1).padStart(4, '0')}`;

        try {
          await this.prisma.$transaction([
            this.prisma.expenseApproval.create({
              data: { expenseId: expense.id, approverId: approverEmployee.id },
            }),
            this.prisma.expense.update({
              where: { id: expenseId },
              data: { status: ExpenseStatus.SUBMIT, expenseNumber },
            }),
            this.prisma.expenseLog.create({
              data: {
                expenseId: expense.id,
                action: ExpenseStatus.SUBMIT,
                message: `Expense submitted for approval${ocrSummary}`,
                createdById: userId,
              },
            }),
            ...attachmentStatusUpdates(),
          ]);
          break;
        } catch (err) {
          const isUniqueClash = (err as { code?: string })?.code === 'P2002';
          if (isUniqueClash && attempt < MAX_ATTEMPTS) continue;
          throw err;
        }
      }
    } else {
      // Resubmission from REVISION: reset existing approval to PENDING
      const existingApproval = await this.prisma.expenseApproval.findFirst({
        where: { expenseId },
      });
      if (!existingApproval) throw new BadRequestException('Approval record not found');

      await this.prisma.$transaction([
        this.prisma.expenseApproval.update({
          where: { id: existingApproval.id },
          data: { status: ApprovalStatus.PENDING, note: null },
        }),
        this.prisma.expense.update({
          where: { id: expenseId },
          data: { status: ExpenseStatus.SUBMIT },
        }),
        this.prisma.expenseLog.create({
          data: {
            expenseId: expense.id,
            action: ExpenseStatus.SUBMIT,
            message: `Expense resubmitted after revision${ocrSummary}`,
            createdById: userId,
          },
        }),
        ...attachmentStatusUpdates(),
      ]);
    }

    return { message: 'Expense submitted successfully' };
  }

  async requestRevision(expenseId: string, userId: string, companyId: string, note: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.SUBMIT)
      throw new BadRequestException('Only SUBMIT expenses can be sent for revision');
    if (!note?.trim())
      throw new BadRequestException('A revision note is required');

    const approval = await this.prisma.expenseApproval.findFirst({
      where: { expenseId },
    });
    if (!approval) throw new BadRequestException('Approval record not found');

    if (membership.role !== CompanyRole.ADMIN) {
      const approverEmployee = await this.prisma.employee.findUnique({
        where: { id: approval.approverId },
      });
      if (!approverEmployee || approverEmployee.userId !== userId)
        throw new ForbiddenException('You are not authorized to request revision for this expense');
    }

    await this.prisma.$transaction([
      this.prisma.expenseApproval.update({
        where: { id: approval.id },
        data: { note },
      }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.REVISION },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId,
          action: ExpenseStatus.REVISION,
          message: note,
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Revision requested' };
  }

  async approveExpense(expenseId: string, userId: string, companyId: string, note?: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.SUBMIT)
      throw new BadRequestException('Only SUBMIT expenses can be approved');

    const approval = await this.prisma.expenseApproval.findFirst({
      where: { expenseId },
    });
    if (!approval) throw new BadRequestException('Approval record not found');

    if (membership.role !== CompanyRole.ADMIN) {
      const approverEmployee = await this.prisma.employee.findUnique({
        where: { id: approval.approverId },
      });
      if (!approverEmployee || approverEmployee.userId !== userId)
        throw new ForbiddenException('You are not authorized to approve this expense');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.expenseApproval.update({
        where: { id: approval.id },
        data: { status: ApprovalStatus.APPROVED, note: note ?? null, approvedAt: now },
      }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.APPROVED, approvedById: userId, approvedAt: now },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId: expense.id,
          action: ExpenseStatus.APPROVED,
          message: note ?? 'Expense approved',
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Expense approved successfully' };
  }

  async rejectExpense(expenseId: string, userId: string, companyId: string, note?: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.SUBMIT)
      throw new BadRequestException('Only SUBMIT expenses can be rejected');

    const approval = await this.prisma.expenseApproval.findFirst({
      where: { expenseId },
    });
    if (!approval) throw new BadRequestException('Approval record not found');

    if (membership.role !== CompanyRole.ADMIN) {
      const approverEmployee = await this.prisma.employee.findUnique({
        where: { id: approval.approverId },
      });
      if (!approverEmployee || approverEmployee.userId !== userId)
        throw new ForbiddenException('You are not authorized to reject this expense');
    }

    await this.prisma.$transaction([
      this.prisma.expenseApproval.update({
        where: { id: approval.id },
        data: { status: ApprovalStatus.REJECTED, note: note ?? null },
      }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.REJECTED },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId: expense.id,
          action: ExpenseStatus.REJECTED,
          message: note ?? 'Expense rejected',
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Expense rejected' };
  }

  private async callGroq(base64: string, mimeType: string): Promise<{ title: string | null; amount: number | null; isReceipt: boolean | null }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new BadRequestException('OCR service not configured');
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey, timeout: 20000, maxRetries: 1 });
    const jsonInstruction = `Return ONLY a raw JSON object with no markdown or explanation: {"title":"vendor name","amount":50000,"isReceipt":true}
The amount must be a plain number with no currency symbols, dots, or commas. Set "isReceipt" to true only if this document is a genuine purchase receipt or invoice showing a vendor and a total; set it to false for anything else (screenshots, selfies, random photos or documents). If you cannot find a value, use null.`;
    try {
      this.logger.debug(`OCR request — mimeType: ${mimeType}, base64 length: ${base64.length}`);
      let content: string;
      if (mimeType === 'application/pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse');
        const { text: pdfText } = await pdfParse(Buffer.from(base64, 'base64'));
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: `Extract the merchant name and total amount from this receipt text.\n${jsonInstruction}\n\nReceipt text:\n${pdfText}` }],
          temperature: 0,
          max_tokens: 200,
        });
        content = response.choices[0].message.content ?? '';
      } else {
        const response = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: 'text', text: `Extract the merchant name and total amount from this receipt.\n${jsonInstruction}` },
            ],
          }],
          temperature: 0,
          max_tokens: 200,
        });
        content = response.choices[0].message.content ?? '';
      }
      const text = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      this.logger.debug(`OCR raw response: ${text}`);
      const parsed = JSON.parse(text);
      const amount =
        typeof parsed.amount === 'number' && Number.isFinite(parsed.amount) && parsed.amount >= 0
          ? parsed.amount
          : null;
      return {
        title: typeof parsed.title === 'string' ? parsed.title : null,
        amount,
        isReceipt: typeof parsed.isReceipt === 'boolean' ? parsed.isReceipt : null,
      };
    } catch (err) {
      this.logger.error(`OCR call failed: ${err instanceof Error ? err.message : String(err)}`);
      return { title: null, amount: null, isReceipt: null };
    }
  }

  async scanReceipt(file: Express.Multer.File) {
    return this.callGroq(file.buffer.toString('base64'), file.mimetype);
  }

  /// Scans every attachment of an expense with OCR. Never throws on OCR/storage
  /// failure — an unreadable attachment comes back as { amount: null, isReceipt: null }
  /// so callers can treat it as "unverified" rather than blocking the workflow.
  private async scanExpenseReceipts(expenseId: string, companyId: string): Promise<{
    results: { attachmentId: string; amount: number | null; isReceipt: boolean | null; scannable: boolean }[];
    totalAmount: number | null;
    firstTitle: string | null;
  }> {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      include: { attachments: true },
    });
    if (!expense) throw new BadRequestException('Expense not found');

    const publicUrlBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
    const scanned = await Promise.all(
      expense.attachments.map(async (attachment) => {
        const scannable =
          attachment.fileType?.startsWith('image/') || attachment.fileType === 'application/pdf';
        if (!scannable) {
          return { attachmentId: attachment.id, amount: null, isReceipt: null, scannable: false, title: null };
        }
        try {
          const key = attachment.fileUrl.replace(`${publicUrlBase}/`, '');
          const obj = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
          const chunks: Buffer[] = [];
          for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) {
            chunks.push(Buffer.from(chunk));
          }
          const res = await this.callGroq(Buffer.concat(chunks).toString('base64'), attachment.fileType ?? 'image/jpeg');
          return { attachmentId: attachment.id, amount: res.amount, isReceipt: res.isReceipt, scannable: true, title: res.title };
        } catch (err) {
          this.logger.error(`OCR attachment scan failed: ${err instanceof Error ? err.message : String(err)}`);
          return { attachmentId: attachment.id, amount: null, isReceipt: null, scannable: true, title: null };
        }
      }),
    );

    const readable = scanned.filter((s) => s.amount !== null).map((s) => s.amount as number);
    const totalAmount = readable.length > 0 ? readable.reduce((a, b) => a + b, 0) : null;
    const firstTitle = scanned.find((s) => s.title)?.title ?? null;
    return {
      results: scanned.map(({ attachmentId, amount, isReceipt, scannable }) => ({ attachmentId, amount, isReceipt, scannable })),
      totalAmount,
      firstTitle,
    };
  }

  async scanExpenseAttachments(expenseId: string, userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);
    const { results, totalAmount, firstTitle } = await this.scanExpenseReceipts(expenseId, companyId);
    if (!results.some((r) => r.scannable))
      throw new BadRequestException('No scannable attachments found (image or PDF required)');
    return { title: firstTitle, amount: totalAmount };
  }

  async financeRejectExpense(expenseId: string, userId: string, companyId: string, note: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if (membership.role !== CompanyRole.FINANCE)
      throw new ForbiddenException('Only FINANCE can reject expenses back to supervisor');

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.APPROVED)
      throw new BadRequestException('Only APPROVED expenses can be sent back to supervisor');
    if (!note?.trim()) throw new BadRequestException('A note explaining the issue is required');

    const approval = await this.prisma.expenseApproval.findFirst({ where: { expenseId } });
    if (!approval) throw new BadRequestException('Approval record not found');

    await this.prisma.$transaction([
      this.prisma.expenseApproval.update({
        where: { id: approval.id },
        data: { status: ApprovalStatus.PENDING, note },
      }),
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.SUBMIT, approvedById: null, approvedAt: null },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId,
          action: ExpenseStatus.SUBMIT,
          message: `Finance flagged receipt: ${note}`,
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Expense sent back to supervisor for review' };
  }

  async reimburseExpense(expenseId: string, userId: string, companyId: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if (membership.role !== CompanyRole.FINANCE)
      throw new ForbiddenException('Only FINANCE can reimburse expenses');

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    if (expense.status !== ExpenseStatus.APPROVED)
      throw new BadRequestException('Only APPROVED expenses can be reimbursed');

    const financeEmployee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!financeEmployee?.unit)
      throw new BadRequestException('Finance employee unit not found');
    if (expense.unit !== financeEmployee.unit)
      throw new ForbiddenException('You can only reimburse expenses from your unit');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: expenseId },
        data: { status: ExpenseStatus.REIMBURSED, reimbursedById: userId, reimbursedAt: now },
      }),
      this.prisma.expenseLog.create({
        data: {
          expenseId: expense.id,
          action: ExpenseStatus.REIMBURSED,
          message: 'Expense reimbursed',
          createdById: userId,
        },
      }),
    ]);

    return { message: 'Expense reimbursed successfully' };
  }
}
