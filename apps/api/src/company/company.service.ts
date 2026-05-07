import { BadRequestException, Injectable } from '@nestjs/common';
import { CompanyRole } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async createCompany(userId: string, name: string) {
    const existingAdmin = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: CompanyRole.ADMIN,
      },
    });

    if (existingAdmin) {
      throw new BadRequestException('You already belong to a company as Admin');
    }
    // create validation if the user is already part of a company with any role, not just admin and the role is not null
    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
      },
    });

    if (existingMembership) {
      throw new BadRequestException('You already belong to a company');
    }

    const existingCompany = await this.prisma.company.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // 👈 case-insensitive (recommended)
        },
      },
    });

    if (existingCompany) {
      throw new BadRequestException('Company name already exists');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.prisma.company.create({
      data: {
        name,
        users: {
          create: {
            user: {
              connect: { id: userId },
            },
            role: CompanyRole.ADMIN,
          },
        },
      },
    });
  }

  async addUserToCompany(
    companyId: string,
    email: string,
    role: CompanyRole,
    positionLevel: string,
    fullName: string,
  ) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    const positionLevelRecord = await this.prisma.positionLevel.findFirst({
      where: { name: positionLevel },
    });

    if (!positionLevelRecord) {
      throw new BadRequestException('Position level not found');
    }

    if (!user) {
      const password = 'temp123';
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          positionLevelId: positionLevelRecord.id,
          fullName,
        },
      });
    }

    return this.prisma.membership.create({
      data: {
        userId: user.id,
        companyId,
        role,
      },
    });
  }

  async getCompanyEmployees(companyId: string) {
    const dataEmployees = await this.prisma.membership.findMany({
      where: {
        companyId,
        NOT: {
          role: 'ADMIN',
        },
      },
      include: {
        user: {
          include: {
            positionLevel: true,
          },
        },
      },
    });

    return dataEmployees.map((item) => ({
      email: item.user.email,
      fullName: item.user.fullName,
      positionLevel: item.user.positionLevel?.name || null,
    }));
  }
}
