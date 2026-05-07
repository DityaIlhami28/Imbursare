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
    addUserToCompany(companyId: string, email: string, role: CompanyRole, positionLevel: string, fullName: string): Promise<{
        id: string;
        createdAt: Date;
        role: import("@prisma/client").$Enums.CompanyRole;
        userId: string;
        companyId: string;
    }>;
    getCompanyEmployees(companyId: string): Promise<{
        email: string;
        fullName: string | null;
        positionLevel: string | null;
    }[]>;
}
