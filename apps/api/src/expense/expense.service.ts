import { Injectable, BadRequestException, Param, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ApprovalStatus, CompanyRole, Employee, ExpenseStatus } from '@prisma/client';
import { uploadToR2 } from '@/storage/upload.service';
import { r2 } from '@/storage/r2.service';
import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpenseService {
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

  async getMyExpenses(userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);
    const myExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        companyId,
      },
    });
    return (
      myExpenses.map((expense) => ({
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        title: expense.title,
        amount: expense.amount,
        status: expense.status,
        createdAt: expense.createdAt,
      })) || []
    );
  }

  async getCompanyExpensesForAdmin(userId: string, companyId: string) {
    const membership = await this.checkUserAuthorization(userId);
    if(!membership || (membership.role !== CompanyRole.ADMIN)){
      throw new ForbiddenException('You are not authorized');
    }
    const expenses = await this.prisma.expense.findMany({
      where: { companyId: membership.companyId },
    });
    return expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      title: e.title,
      amount: e.amount,
      status: e.status,
      unit: e.unit,
      createdAt: e.createdAt,
      userId: e.userId,
      companyId: e.companyId,
    }));
  }

  async getCompanyExpensesForFinance(userId: string, companyId: string) {
    const membership = await this.checkUserAuthorization(userId, companyId);
    if(!membership || membership.role !== CompanyRole.FINANCE){
      throw new ForbiddenException('You are not authorized');
    }
    const checkUnit = await this.prisma.employee.findFirst({
      where: { userId },
    });
    if (!checkUnit || !checkUnit.unit) {
      throw new BadRequestException('Unit not found for this user');
    }
    const expenses = await this.prisma.expense.findMany({
      where: {
        unit: checkUnit.unit,
        companyId: membership.companyId,
        status: { in: ['APPROVED', 'REIMBURSED'] },
      },
    });
    return expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      title: e.title,
      amount: e.amount,
      status: e.status,
      createdAt: e.createdAt,
    }));
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
    await this.checkUserAuthorization(userId, companyId);
    const expenseDetails = await this.prisma.expense.findUnique({
      where: {
        id: expenseId,
      },
      include: {
        attachments: true,
        category: true,
      },
    });
    if (!expenseDetails) {
      throw new BadRequestException('Expense not found');
    }
    return {
      id: expenseDetails.id,
      expenseNumber: expenseDetails.expenseNumber,
      title: expenseDetails.title,
      description: expenseDetails.description,
      amount: expenseDetails.amount,
      status: expenseDetails.status,
      attachments: expenseDetails.attachments
        ? expenseDetails.attachments.map((attachment) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            fileUrl: attachment.fileUrl,
            fileType: attachment.fileType,
            size: attachment.size,
          }))
        : [],
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
    await this.checkUserAuthorization(userId, companyId);

    const logs = await this.prisma.expenseLog.findMany({
      where: {
        expenseId,
      },
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
      data.amount = Number(dto.amount);
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
          include: { category: true, user: true },
        },
      },
    });

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
      createdAt: a.expense.createdAt,
      approvalNote: a.note ?? null,
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

  async getAllApprovals(userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);

    const employee = await this.prisma.employee.findFirst({
      where: { userId, companyId },
    });
    if (!employee) return [];

    const approvals = await this.prisma.expenseApproval.findMany({
      where: { approverId: employee.id },
      include: {
        expense: {
          include: { category: true, user: true },
        },
      },
    });

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
      createdAt: a.expense.createdAt,
      approvalNote: a.note ?? null,
    }));
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
      const unitCount = await this.prisma.expense.count({
        where: {
          companyId,
          unit: expense.unit,
          expenseNumber: { not: null },
          createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
        },
      });
      const expenseNumber = `EXP/${unitSlug}/${year}/${String(unitCount + 1).padStart(4, '0')}`;

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
            message: 'Expense submitted for approval',
            createdById: userId,
          },
        }),
      ]);
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
            message: 'Expense resubmitted after revision',
            createdById: userId,
          },
        }),
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

  private async callGroq(base64: string, mimeType: string): Promise<{ title: string | null; amount: number | null }> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new BadRequestException('OCR service not configured');
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey });
    const jsonInstruction = `Return ONLY a raw JSON object with no markdown or explanation: {"title":"vendor name","amount":50000}
The amount must be a plain number with no currency symbols, dots, or commas. If you cannot find a value, use null.`;
    try {
      console.log('[OCR] Sending request — mimeType:', mimeType, '| base64 length:', base64.length);
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
      console.log('[OCR] Raw response:', text);
      const parsed = JSON.parse(text);
      console.log('[OCR] Parsed:', parsed);
      return {
        title: typeof parsed.title === 'string' ? parsed.title : null,
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      };
    } catch (err) {
      console.error('[OCR] Error:', err);
      return { title: null, amount: null };
    }
  }

  async scanReceipt(file: Express.Multer.File) {
    return this.callGroq(file.buffer.toString('base64'), file.mimetype);
  }

  async scanExpenseAttachments(expenseId: string, userId: string, companyId: string) {
    await this.checkUserAuthorization(userId, companyId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
      include: { attachments: true },
    });
    if (!expense) throw new BadRequestException('Expense not found');
    const imageAttachments = expense.attachments.filter(
      (a) => a.fileType?.startsWith('image/') || a.fileType === 'application/pdf',
    );
    if (!imageAttachments.length) throw new BadRequestException('No scannable attachments found (image or PDF required)');

    const publicUrlBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');
    const results = await Promise.all(
      imageAttachments.map(async (attachment) => {
        const key = attachment.fileUrl.replace(`${publicUrlBase}/`, '');
        const obj = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
        const chunks: Buffer[] = [];
        for await (const chunk of obj.Body as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk));
        }
        return this.callGroq(Buffer.concat(chunks).toString('base64'), attachment.fileType ?? 'image/jpeg');
      }),
    );

    const totalAmount = results.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const firstTitle = results.find((r) => r.title)?.title ?? null;
    return { title: firstTitle, amount: totalAmount > 0 ? totalAmount : null };
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
