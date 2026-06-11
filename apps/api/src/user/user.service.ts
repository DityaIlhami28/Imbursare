import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: true,
      },
    });
  }
  async getProfile(id: string) {
    const data = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            company: true,
          },
        },
      },
    });
    if (!data) {
      throw new NotFoundException('User not found');
    }

    return {
      email: data.email,
      company: data.memberships?.[0]?.company?.name || null,
      role: data.memberships?.[0]?.role || null,
    };
  }
  async createUser(data: {
    email: string;
    password: string;
  }) {
    return this.prisma.user.create({ data });
  }
}
