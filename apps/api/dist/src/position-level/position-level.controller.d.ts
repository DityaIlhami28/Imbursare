import { PositionService } from './position-level.service';
export declare class PositionLevelController {
    private readonly positionService;
    constructor(positionService: PositionService);
    getPosition(req: any): Promise<{
        id: string;
        name: string;
        level: number;
    }[]>;
    addPosition(req: any, name: string, level: string): Promise<{
        id: string;
        name: string;
        level: number;
        companyId: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPositionDetails(req: any): Promise<{
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
}
