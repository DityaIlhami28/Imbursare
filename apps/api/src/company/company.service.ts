import { BadRequestException, Injectable } from '@nestjs/common';
import { CompanyRole } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
// import { PrismaService } from 'prisma.config';
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
        userId
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
    throw new BadRequestException(
      'Company name already exists',
    );
  }

    return this.prisma.company.create({
      data: {
        name,
        users: {
          create: {
            userId,
            role: CompanyRole.ADMIN, // 🔥 important
          },
        },
      },
    });
  }

  async addUserToCompany(companyId: string, email: string, role: CompanyRole) {
    let user = await this.prisma.user.findUnique({ where: { email } });

    
    if (!user) {
      const password = 'temp123';
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
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
}
