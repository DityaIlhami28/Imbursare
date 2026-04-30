import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';


@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: true,
      },
    });
  }
  createUser(data: { email: string; password: string }) {
    return this.prisma.user.create({ data });
  }
}
