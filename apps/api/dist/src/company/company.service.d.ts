import { CompanyRole } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
export declare class CompanyService {
    private prisma;
    constructor(prisma: PrismaService);
    createCompany(userId: string, name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    addUserToCompany(companyId: string, email: string, role: CompanyRole, positionLevel: string, fullName: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        companyId: string;
        role: import("@prisma/client").$Enums.CompanyRole;
    }>;
    getCompanyEmployees(companyId: string): Promise<{
        email: string;
        fullName: string | null;
        positionLevel: string | null;
    }[]>;
}
