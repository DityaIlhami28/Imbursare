import { PrismaService } from "../../prisma/prisma.service";
export declare class CategoryService {
    private prisma;
    constructor(prisma: PrismaService);
    createCategory(userId: string, companyId: string, name: string): Promise<{
        id: string;
        name: string;
        companyId: string;
    }>;
    getCategories(companyId: string): Promise<{
        id: string;
        name: string;
        companyId: string;
    }[]>;
}
