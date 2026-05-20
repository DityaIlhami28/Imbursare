import { ExpenseService } from './expense.service';
export declare class ExpenseController {
    private readonly expenseService;
    constructor(expenseService: ExpenseService);
    addExpense(req: any, files: Express.Multer.File[], body: any): Promise<string>;
    getMyExpenses(req: any): Promise<{
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
    getCompanyExpensesForAdmin(req: any): Promise<{
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
    getCompanyExpensesForFinance(req: any): Promise<{
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
    getExpenseById(req: any): Promise<({
        attachments: {
            id: string;
            createdAt: Date;
            fileName: string;
            fileUrl: string;
            fileType: string | null;
            size: number | null;
            expenseId: string;
        }[];
    } & {
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
    }) | null>;
}
