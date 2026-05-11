import { PrismaService } from "../../prisma/prisma.service";
export declare class AmountPolicyService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getAmountPolicies(userId: string): Promise<{
        id: string;
        positionLevelId: string;
        name: string;
        companyId: string;
        minAmount: number;
        maxAmount: number;
        totalTransactions: number;
    }[]>;
    addAmountPolicy(userId: string, name: string, minAmount: number, maxAmount: number, positionLevel: string, totalTransactions: number, companyId: string): Promise<{
        id: string;
        positionLevelId: string;
        name: string;
        companyId: string;
        minAmount: number;
        maxAmount: number;
        totalTransactions: number;
    }>;
}
