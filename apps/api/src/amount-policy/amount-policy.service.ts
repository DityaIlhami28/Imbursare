import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CompanyRole } from '@prisma/client';

@Injectable()
export class AmountPolicyService {
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

  async getAmountPolicies(userId: string) {
    const membership = await this.requireAdminOrFinance(userId);
    return this.prisma.amountPolicy.findMany({
      where: {
        companyId: membership.companyId,
      },
    });
  }

  async addAmountPolicy(
    userId: string,
    name: string,
    minAmount: number,
    maxAmount: number,
    positionLevel: string,
    totalTransactions: number,
    companyId: string,
  ) {
    await this.requireAdminOrFinance(userId);

    const checkExisting = await this.prisma.amountPolicy.findFirst({
      where: { name, companyId },
    });

    if (checkExisting) {
      throw new BadRequestException('Amount policy already exists');
    }

    const positionLevelRecord = await this.prisma.positionLevel.findFirst({
      where: { name: positionLevel },
    });


    if (!positionLevelRecord) {
      throw new BadRequestException('Position level not found');
    }
    
    const positionLevelId = positionLevelRecord.id;

    return this.prisma.amountPolicy.create({
      data: { name, minAmount, maxAmount, positionLevelId, totalTransactions, companyId },
    });
  }
}
