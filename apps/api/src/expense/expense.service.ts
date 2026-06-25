import { Injectable, BadRequestException, Param, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CompanyRole } from '@prisma/client';
import { uploadToR2 } from '@/storage/upload.service';
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
    return this.prisma.expense.findMany({
      where: {
        companyId: membership.companyId,
      },
    });
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
    return (
      this.prisma.expense.findMany({
        where: {
          unit: checkUnit.unit,
          companyId: membership.companyId,
          status: {
            in: ['APPROVED', 'REIMBURSED'],
          },
        },
      }) || []
    );
  }

  async addExpense(
    dto: CreateExpenseDto,
    userId: string,
    companyId: string,
    files?: Express.Multer.File[],
  ) {
    await this.checkUserAuthorization(userId, companyId);
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
    if (!checkEmployee.positionId) {
      throw new BadRequestException('Position not found');
    }
    if (!checkEmployee.unit) {
      throw new BadRequestException('Unit not found');
    }

    const checkLevelEmployee = await this.prisma.position.findFirst({
      where: { id: checkEmployee.positionId },
    });
    if (!checkLevelEmployee) {
      throw new BadRequestException('Position not found');
    }

    const checkAmountPolicy = await this.prisma.amountPolicy.findFirst({
      where: {
        companyId: companyId,
        level: checkLevelEmployee.level,
      },
    });
    if (checkAmountPolicy) {
      if (amount > checkAmountPolicy.maxAmount) {
        throw new BadRequestException(
          'Amount is over the allowed limit for your position level',
        );
      }
      const checkTotalTransactions = await this.prisma.expense.count({
        where: {
          userId,
          status: {
            in: ['SUBMIT', 'APPROVED'],
          },
        },
      });
      if (checkTotalTransactions >= checkAmountPolicy.totalTransactions) {
        throw new BadRequestException(
          'You have reached the maximum number of transactions allowed for your position level please wait until your transactions are reviewed by Finance',
        );
      }
    } else {
      throw new BadRequestException(
        'Amount policy not found for your position level',
      );
    }
    const expense = await this.prisma.expense.create({
      data: {
        amount: amount,
        description: dto.description ?? '',
        title: dto.title ?? '',
        userId: userId,
        companyId: companyId,
        categoryId: categoryRecord.id,
        unit: checkEmployee.unit ?? undefined,
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
  ) {
    await this.checkUserAuthorization(userId, companyId);
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });
    if (!expense) {
      throw new BadRequestException('Expense not found');
    }

    const data: any = { ...dto };
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
}
