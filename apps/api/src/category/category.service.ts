import { BadRequestException, Injectable } from '@nestjs/common';
import { CompanyRole } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async createCategory(userId: string, companyId: string, name: string) {
    const checkMembership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
    console.log('checkMembership', checkMembership);

    if (
      checkMembership?.role !== CompanyRole.ADMIN &&
      checkMembership?.role !== CompanyRole.FINANCE
    ) {
      throw new BadRequestException(
        'You are not an admin/finance of this company',
      );
    }
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // 👈 case-insensitive (recommended)
        },
        companyId,
      },
    });

    if (existingCategory) {
      throw new BadRequestException('Category already exists');
    }

    return this.prisma.category.create({
      data: {
        name,
        companyId,
      },
    });
  }

  async getCategories(companyId: string) {
    return this.prisma.category.findMany({
      where: {
        companyId,
      },
    });
  }
}
