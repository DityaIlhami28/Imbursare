import { PrismaService } from "../../prisma/prisma.service";
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): import("@prisma/client").Prisma.Prisma__UserClient<({
        memberships: {
            id: string;
            createdAt: Date;
            userId: string;
            companyId: string;
            role: import("@prisma/client").$Enums.CompanyRole;
        }[];
    } & {
        id: string;
        email: string;
        password: string;
        fullName: string | null;
        positionLevelId: string | null;
        supervisorId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    createUser(data: {
        email: string;
        password: string;
        positionLevelId?: string;
        fullName: string;
    }): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        password: string;
        fullName: string | null;
        positionLevelId: string | null;
        supervisorId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
