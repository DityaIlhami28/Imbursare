import { BadRequestException, Injectable } from '@nestjs/common';
import { CompanyRole } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AuthService } from '@/auth/auth.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

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
        memberships: {
          create: {
            userId,
            role: CompanyRole.ADMIN,
          },
        },
      },
    });
  }

  async addUserToCompany(
    companyId: string,
    fullName: string,
    email: string,
    role: CompanyRole,
  ) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    let isNewAccount = false;

    if (!user) {
      // Provision a pending account with an unusable random password. The invite
      // link (below) is the only way to set a real one — nothing is hardcoded.
      const unusablePassword = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email,
          password: unusablePassword,
          state: 0, // pending until the invite is accepted
        },
      });
      isNewAccount = true;
    }

    // Ensure an employee profile exists for this company (covers the case where an
    // already-registered user is added to a new company).
    const existingEmployee = await this.prisma.employee.findFirst({
      where: { userId: user.id, companyId },
    });
    if (!existingEmployee) {
      await this.prisma.employee.create({
        data: { email, fullName, companyId, userId: user.id },
      });
    }

    const existingMembership = await this.prisma.membership.findFirst({
      where: { userId: user.id, companyId },
    });
    if (existingMembership) {
      throw new BadRequestException('This user is already a member of the company');
    }

    const membership = await this.prisma.membership.create({
      data: { userId: user.id, companyId, role },
    });

    // Only freshly-provisioned accounts need an invite to set their password.
    const inviteLink = isNewAccount ? await this.authService.createInvite(user.id) : null;

    return { message: 'User added to company', membership, inviteLink };
  }

  async getCompanyEmployees(companyId: string) {
    const dataEmployees = await this.prisma.employee.findMany({
      where: {
        companyId,
      },
      include: {
        position: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return dataEmployees.map((employee) => ({
      id: employee.id,
      email: employee.email,
      fullName: employee.fullName,
      position: employee.position ? {
        id: employee.position.id,
        name: employee.position.name,
      } : null,
      unit: employee.unit,
    })) || [];
  }

  async getEmployeeDetails(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId, companyId: companyId },
      include: {
        position: true,
        subordinates: true,
      },
    });
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }
    const supervisor = employee.supervisorId
      ? await this.prisma.employee.findUnique({
          where: { id: employee.supervisorId },
        })
      : null;
    const subordinates = employee.subordinates.map((sub) => ({
      id: sub.id,
      fullName: sub.fullName,
    })) || [];

    return {
      id: employee.id,
      email: employee.email,
      fullName: employee.fullName,
      position: employee.position ?{
        id: employee.position.id,
        name: employee.position.name,
      } : null,
      address: employee.address,
      phone: employee.phone,
      unit: employee.unit,
      supervisor: supervisor ? {
        id: supervisor.id,
        fullName: supervisor.fullName,
      } : null,
      subordinates: subordinates,
    };
  }

  async updateEmployeeData(
    employeeId: string,
    dto: UpdateEmployeeDto,
    userId: string,
  ) {
    const checkUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!checkUser) {
      throw new BadRequestException('User not found');
    }
    if (dto.supervisorId === employeeId) {
    throw new BadRequestException(
      'Employee cannot be their own supervisor',
    );
  }

    return this.prisma.employee.update({
    where: { id: employeeId },
    data: dto,
    include: {
      position: true,
      supervisor: true,
    },
  });
  }
}
