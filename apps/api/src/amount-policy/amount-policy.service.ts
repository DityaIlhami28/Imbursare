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
    maxAmount: number,
    positionLevel: string,
    totalTransactions: number,
    companyId: string,
  ) {
    await this.requireAdminOrFinance(userId);

    const positionLevelValue = {
      "staff": 1,
      "supervisor": 2,
      "manager": 3,
      "director": 4,
      "vp": 5,
      "c-level": 6,
    };

    const level = positionLevelValue[positionLevel.toLowerCase()];

    if (!level) {
      throw new BadRequestException('Invalid position level');
    }

    const checkExisting = await this.prisma.amountPolicy.findFirst({
      where: { level, companyId },
    });

    if (checkExisting) {
      throw new BadRequestException('Amount policy already exists');
    }

    const positionLevelRecord = await this.prisma.position.findFirst({
      where: { level },
    });


    if (!positionLevelRecord) {
      throw new BadRequestException('Position level not found');
    }
    
    return this.prisma.amountPolicy.create({
      data: {
        maxAmount,
        level,
        totalTransactions,
        companyId
      },
    });
  }
}
