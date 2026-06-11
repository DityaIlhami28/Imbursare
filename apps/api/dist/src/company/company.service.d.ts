import { CompanyRole } from '@prisma/client';
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateEmployeeDto } from './dto/update-employee.dto';
export declare class CompanyService {
    private prisma;
    constructor(prisma: PrismaService);
    createCompany(userId: string, name: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addUserToCompany(companyId: string, fullName: string, email: string, role: CompanyRole): Promise<{
        id: string;
        createdAt: Date;
        role: import("@prisma/client").$Enums.CompanyRole;
        userId: string;
        companyId: string;
    }>;
    getCompanyEmployees(companyId: string): Promise<{
        id: string;
        email: string;
        fullName: string;
        position: {
            id: string;
            name: string;
        } | null;
        unit: string | null;
    }[]>;
    getEmployeeDetails(employeeId: string, companyId: string): Promise<{
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
    updateEmployeeData(employeeId: string, dto: UpdateEmployeeDto, userId: string): Promise<{
        position: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            level: number;
        } | null;
        supervisor: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            companyId: string;
            email: string;
            fullName: string;
            address: string | null;
            phone: string | null;
            unit: string | null;
            positionId: string | null;
            supervisorId: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        companyId: string;
        email: string;
        fullName: string;
        address: string | null;
        phone: string | null;
        unit: string | null;
        positionId: string | null;
        supervisorId: string | null;
    }>;
}
