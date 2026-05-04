import { CompanyRole } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
export declare class CompanyService {
    private prisma;
    constructor(prisma: PrismaService);
    createCompany(userId: string, name: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addUserToCompany(companyId: string, email: string, role: CompanyRole): Promise<{
        id: string;
        createdAt: Date;
        role: import(".prisma/client").$Enums.CompanyRole;
        userId: string;
        amountPolicyId: string | null;
        companyId: string;
    }>;
}
