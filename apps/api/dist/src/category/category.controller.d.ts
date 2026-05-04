import { CategoryService } from './category.service';
export declare class CategoryController {
    private categoryService;
    constructor(categoryService: CategoryService);
    create(req: any, body: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        companyId: string;
    }>;
    getCategories(req: any): Promise<{
        id: string;
        name: string;
        companyId: string;
    }[]>;
}
