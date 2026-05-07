import { PrismaService } from '../../prisma/prisma.service';
export declare class PositionLevelService {
    private prisma;
    constructor(prisma: PrismaService);
    private requireAdminOrFinance;
    getPositionLevels(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
    }[]>;
    addPositionLevel(userId: string, name: string, companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
    }>;
    addPositionLevelToUser(userId: string, positionLevel: string): Promise<{
        id: string;
        email: string;
        password: string;
        fullName: string | null;
        positionLevelId: string | null;
        supervisorId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
