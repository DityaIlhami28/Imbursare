import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddUserDto } from './dto/add-user.dto';
export declare class CompanyController {
    private companyService;
    constructor(companyService: CompanyService);
    create(req: any, body: CreateCompanyDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addUser(req: any, body: AddUserDto): Promise<{
        id: string;
        createdAt: Date;
        role: import("@prisma/client").$Enums.CompanyRole;
        userId: string;
        companyId: string;
    }>;
    getEmployees(req: any): Promise<{
        email: string;
        fullName: string | null;
        positionLevel: string | null;
    }[]>;
}
