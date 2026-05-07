import { UserService } from "../user/user.service";
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private userService;
    private jwtService;
    constructor(userService: UserService, jwtService: JwtService);
    register(email: string, password: string, fullName: string): Promise<{
        id: string;
        email: string;
        fullName: string | null;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
    }>;
}
