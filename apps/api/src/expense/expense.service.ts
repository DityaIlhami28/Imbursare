import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CompanyRole } from '@prisma/client';

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
}
