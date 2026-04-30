import { PrismaService } from "../../prisma/prisma.service";
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): import(".prisma/client").Prisma.Prisma__UserClient<({
        memberships: {
            id: string;
            createdAt: Date;
            userId: string;
            companyId: string;
            role: import(".prisma/client").$Enums.CompanyRole;
            amountPolicyId: string | null;
        }[];
    } & {
        id: string;
        email: string;
        password: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    createUser(data: {
        email: string;
        password: string;
    }): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        password: string;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
