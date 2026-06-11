import { PrismaService } from "../../prisma/prisma.service";
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class ExpenseService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getMyExpenses(userId: string): Promise<{
        id: string;
        title: string;
        amount: number;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        createdAt: Date;
    }[]>;
    getCompanyExpensesForAdmin(userId: string): Promise<{
        id: string;
        title: string;
        description: string;
        amount: number;
        unit: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        userId: string;
        companyId: string;
        categoryId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reimbursedById: string | null;
        reimbursedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getCompanyExpensesForFinance(userId: string): Promise<{
        id: string;
        title: string;
        description: string;
        amount: number;
        unit: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        userId: string;
        companyId: string;
        categoryId: string;
        approvedById: string | null;
        approvedAt: Date | null;
        reimbursedById: string | null;
        reimbursedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    addExpense(dto: CreateExpenseDto, userId: string, companyId: string, files?: Express.Multer.File[]): Promise<{
        message: string;
        expenseId: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
    }>;
    getExpenseDetails(expenseId: string): Promise<{
        id: string;
        title: string;
        description: string;
        amount: number;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        attachments: {
            id: string;
            fileName: string;
            fileUrl: string;
            fileType: string | null;
            size: number | null;
        }[];
        category: {
            id: string;
            name: string;
        } | null;
        createdAt: Date;
    }>;
    getExpenseLogs(expenseId: string, userId: string): Promise<{
        id: string;
        action: import("@prisma/client").$Enums.ExpenseStatus;
        message: string | null;
        createdById: string | null;
        createdAt: Date;
    }[]>;
}
