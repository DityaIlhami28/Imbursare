import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class ExpenseController {
    private readonly expenseService;
    constructor(expenseService: ExpenseService);
    addExpense(req: any, files: Express.Multer.File[], dto: CreateExpenseDto): Promise<{
        message: string;
        expenseId: string;
        status: import("@prisma/client").$Enums.ExpenseStatus;
    }>;
    getMyExpenses(req: any): Promise<{
        id: string;
        title: string;
        amount: number;
        status: import("@prisma/client").$Enums.ExpenseStatus;
        createdAt: Date;
    }[]>;
    getCompanyExpensesForAdmin(req: any): Promise<{
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
    getCompanyExpensesForFinance(req: any): Promise<{
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
    getExpenseDetails(req: any): Promise<{
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
    getExpenseLogs(req: any): Promise<{
        id: string;
        action: import("@prisma/client").$Enums.ExpenseStatus;
        message: string | null;
        createdById: string | null;
        createdAt: Date;
    }[]>;
}
