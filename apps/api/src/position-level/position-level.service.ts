import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyRole } from '@prisma/client';

@Injectable()
export class PositionLevelService {
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

  async getPositionLevels(userId: string) {
    await this.requireAdminOrFinance(userId);
    return this.prisma.positionLevel.findMany();
  }

  async addPositionLevel(userId: string, name: string, companyId: string) {
    await this.requireAdminOrFinance(userId);

    const checkExisting = await this.prisma.positionLevel.findFirst({
      where: { name, companyId },
    });

    if (checkExisting) {
      throw new BadRequestException('Position level already exists');
    }

    return this.prisma.positionLevel.create({
      data: { name, companyId },
    });
  }

  async addPositionLevelToUser(userId: string, positionLevel: string) {
    await this.requireAdminOrFinance(userId);

    const positionLevelRecord = await this.prisma.positionLevel.findFirst({
      where: { name: positionLevel },
    });

    if (!positionLevelRecord) {
      throw new BadRequestException('Position level not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { positionLevelId: positionLevelRecord.id },
    });
  }
}
