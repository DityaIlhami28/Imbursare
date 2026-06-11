import { PrismaService } from '../../prisma/prisma.service';
export declare class PositionService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getPosition(userId: string): Promise<{
        id: string;
        name: string;
        level: number;
    }[]>;
    getPositionDetails(userId: string, positionId: string): Promise<{
        employees: {
            id: string;
            companyId: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            fullName: string;
            email: string;
            address: string | null;
            phone: string | null;
            unit: string | null;
            positionId: string | null;
            supervisorId: string | null;
        }[];
    } & {
        id: string;
        name: string;
        level: number;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addPosition(userId: string, name: string, level: string, companyId: string): Promise<{
        id: string;
        name: string;
        level: number;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
