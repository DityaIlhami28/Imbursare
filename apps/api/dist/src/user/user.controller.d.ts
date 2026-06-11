import { UserService } from './user.service';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getProfile(req: any): Promise<{
        email: string;
        company: string | null;
        role: import("@prisma/client").$Enums.CompanyRole;
    }>;
}
