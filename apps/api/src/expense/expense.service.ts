import { Injectable, BadRequestException, Param } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CompanyRole } from '@prisma/client';
import { uploadToR2 } from '@/storage/upload.service';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  private async requireAdminOrFinance(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: { in: [CompanyRole.ADMIN, CompanyRole.FINANCE] },
      },
    });

    if (!membership) {
      throw new BadRequestException('You are not authorized');
    }

    return membership;
  }

  async getMyExpenses(userId: string) {
    return this.prisma.expense.findMany({
      where: {
        userId,
      },
    });
  }

  async getCompanyExpensesForAdmin(userId: string) {
    const membership = await this.requireAdminOrFinance(userId);
    return this.prisma.expense.findMany({
      where: {
        companyId: membership.companyId,
      },
    });
  }

  async getCompanyExpensesForFinance(userId: string) {
    const membership = await this.requireAdminOrFinance(userId);
    return this.prisma.expense.findMany({
      where: {
        companyId: membership.companyId,
        status: {
            in: ['APPROVED', 'REIMBURSED']
        }
      },
    });
  }

  async addExpense(
    userId: string,
    amount: number,
    description: string,
    title: string,
    companyId: string,
    category: string,
    files?: Express.Multer.File[],
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
    });
    if (!membership) {
      throw new BadRequestException('You are not authorized');
    }

    const categoryRecord = await this.prisma.category.findFirst({
      where: { name: category, companyId },
    });
    if (!categoryRecord) {
      throw new BadRequestException('Category not found');
    }

    const checkUser = await this.prisma.user.findFirst({
      where: { id: userId },
    });
    if (checkUser) {
      if (!checkUser.positionLevelId) {
        throw new BadRequestException('Position level not found');
      }
    } else {
      throw new BadRequestException('User not found');
    }

    const checkAmountPolicy = await this.prisma.amountPolicy.findFirst({
      where: {
        companyId,
        positionLevelId: checkUser.positionLevelId,
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
          status:{
            notIn: ["REIMBURSED", "REJECTED"]
          }
        },
      });
      if (checkTotalTransactions >= checkAmountPolicy.totalTransactions) {
        throw new BadRequestException(
          'You have reached the maximum number of transactions allowed for your position level please wait until your transactions are reviewed by Finance'
        );
      }
    } else {
      throw new BadRequestException(
        'Amount policy not found for your position level',
      );
    }
    const expense = await this.prisma.expense.create({
      data: {
        amount,
        description,
        title,
        userId,
        companyId,
        categoryId: categoryRecord.id,
      },
    });

    if (files && files.length > 0) {
      files.forEach((file) => {
        if (file.size > 4 * 1024 * 1024) {
          throw new BadRequestException('File size should be less than 4MB');
        }
        const IsImage = file.mimetype.startsWith('image/');
        const IsPdf = file.mimetype === 'application/pdf';
        const IsDocx = file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!IsImage && !IsPdf && !IsDocx) {
          throw new BadRequestException(
            `File ${file.originalname} has an invalid type. Only images, PDFs, and Word documents are allowed`,
          );
        }
      });
      const uploaded = await Promise.all(
        files.map((file) => uploadToR2(file)),
      )

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

    return 'Expense created successfully';
  }

  async getExpenseById(expenseId: string) {
    return this.prisma.expense.findUnique({
      where: {
        id: expenseId,
      },
      include: {
        attachments: true,
      },
    });
  }
}
