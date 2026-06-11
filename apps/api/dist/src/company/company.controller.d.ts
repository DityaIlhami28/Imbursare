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
        id: string;
        email: string;
        fullName: string;
        position: {
            id: string;
            name: string;
        } | null;
        unit: string | null;
    }[]>;
    getEmployeeDetails(req: any): Promise<{
        id: string;
        email: string;
        fullName: string;
        position: {
            id: string;
            name: string;
        } | null;
        address: string | null;
        phone: string | null;
        unit: string | null;
        supervisor: {
            id: string;
            fullName: string;
        } | null;
        subordinates: {
            id: string;
            fullName: string;
        }[];
    }>;
}
