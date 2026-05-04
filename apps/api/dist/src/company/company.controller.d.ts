import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddUserDto } from './dto/add-user.dto';
export declare class CompanyController {
    private companyService;
    constructor(companyService: CompanyService);
    create(req: any, body: CreateCompanyDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
    }>;
    addUser(req: any, body: AddUserDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        companyId: string;
        role: import("@prisma/client").$Enums.CompanyRole;
        amountPolicyId: string | null;
    }>;
}
