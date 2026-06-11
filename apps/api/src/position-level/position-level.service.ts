import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyRole } from '@prisma/client';
// import { AddPositionToUserDto } from './dto/add-user-position.dto';

@Injectable()
export class PositionService {
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

  async getPosition(userId: string) {
    const membership = await this.requireAdminOrFinance(userId);
    const positions = await this.prisma.position.findMany({
      where: { companyId: membership.companyId },
    });
    return positions.map((pos) => ({
      id: pos.id,
      name: pos.name,
      level: pos.level,
    })) || [];
  }

  async getPositionDetails(userId: string, positionId: string) {
    await this.requireAdminOrFinance(userId);

    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: { employees: true },
    });

    if (!position) {
      throw new BadRequestException('Position not found');
    }

    return position;
  }

  async addPosition(
    userId: string,
    name: string,
    level: string,
    companyId: string,
  ) {
    await this.requireAdminOrFinance(userId);

    const checkExisting = await this.prisma.position.findFirst({
      where: { name, companyId },
    });

    if (checkExisting) {
      throw new BadRequestException('Position  already exists');
    }

    const positionLevelValue = {
      staff: 1,
      supervisor: 2,
      manager: 3,
      director: 4,
      vp: 5,
      'c-level': 6,
    };

    if (!level) {
      throw new BadRequestException('positionLevel is required');
    }

    const normalized = level.toLowerCase().trim();

    const levelValue = positionLevelValue[normalized];

    if (!levelValue) {
      throw new BadRequestException('Invalid position level');
    }

    return this.prisma.position.create({
      data: { name, companyId, level: levelValue },
    });
  }
}
