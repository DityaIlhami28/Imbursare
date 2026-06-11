import { PrismaService } from "../../prisma/prisma.service";
export declare class AmountPolicyService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getAmountPolicies(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        level: number;
        maxAmount: number;
        totalTransactions: number;
    }[]>;
    addAmountPolicy(userId: string, maxAmount: number, positionLevel: string, totalTransactions: number, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        level: number;
        maxAmount: number;
        totalTransactions: number;
    }>;
}
