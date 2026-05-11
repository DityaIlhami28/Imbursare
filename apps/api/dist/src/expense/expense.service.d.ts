import { PrismaService } from "../../prisma/prisma.service";
export declare class ExpenseService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getMyExpenses(userId: string): Promise<{
        id: string;
        title: string;
        amount: number;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        userId: string;
        companyId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reimbursedById: string | null;
        reimbursedAt: Date | null;
        categoryId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getCompanyExpensesForAdmin(userId: string): Promise<{
        id: string;
        title: string;
        amount: number;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        userId: string;
        companyId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reimbursedById: string | null;
        reimbursedAt: Date | null;
        categoryId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getCompanyExpensesForFinance(userId: string): Promise<{
        id: string;
        title: string;
        amount: number;
        description: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        userId: string;
        companyId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reimbursedById: string | null;
        reimbursedAt: Date | null;
        categoryId: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    addExpense(userId: string, amount: number, description: string, title: string, companyId: string, category: string): Promise<string>;
}
