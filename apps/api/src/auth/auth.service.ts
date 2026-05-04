import { UserService } from '@/user/user.service';
import { BadRequestException, Injectable, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    async register(email: string, password: string) {
        const userExists = await this.userService.findByEmail(email);
        if (userExists) {
            throw new BadRequestException("Email already in use");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userService.createUser({ email, password: hashedPassword });
        
        return {
            id: user.id,
            email: user.email
        };
    }

    async login(email: string, password: string) {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new BadRequestException("Invalid credentials");
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            throw new BadRequestException("Invalid credentials");
        }
        const membership = user.memberships[0];

        const payload = { 
            sub: user.id, 
            email: user.email,
            companyId: membership?.companyId,
            role: membership?.role
        };

        return {
            access_token: this.jwtService.sign(payload)
        };
    }
}
