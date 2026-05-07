import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(data: {
        email: string;
        password: string;
        fullName: string;
    }): Promise<{
        id: string;
        email: string;
        fullName: string | null;
    }>;
    login(data: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
    }>;
}
