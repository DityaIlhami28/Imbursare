import { PositionLevelService } from './position-level.service';
export declare class PositionLevelController {
    private readonly positionLevelService;
    constructor(positionLevelService: PositionLevelService);
    getPositionLevels(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
    }[]>;
    addPositionLevel(req: any, name: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
    }>;
    addPositionLevelToUser(req: any, positionLevel: string): Promise<{
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
