import { Controller, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/password.dto';


@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    register(@Body() data: { email: string; password: string }) {
        return this.authService.register(data.email, data.password );
    }

    @Post('login')
    login(@Body() data: { email: string; password: string }) {
        return this.authService.login(data.email, data.password);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        await this.authService.forgotPassword(dto.email);
        return { message: 'If an account exists for that email, a reset link has been sent.' };
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        await this.authService.setPasswordFromToken(dto.token, dto.password);
        return { message: 'Password set successfully. You can now log in.' };
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
        await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
        return { message: 'Password changed successfully.' };
    }
}
