import { PrismaService } from "../../prisma/prisma.service";
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<({
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
        state: number;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    getProfile(id: string): Promise<{
        email: string;
        company: string | null;
        role: import("@prisma/client").$Enums.CompanyRole;
    }>;
    createUser(data: {
        email: string;
        password: string;
    }): Promise<{
        id: string;
        email: string;
        password: string;
        state: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
