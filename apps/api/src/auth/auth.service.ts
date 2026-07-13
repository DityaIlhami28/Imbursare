import { UserService } from '@/user/user.service';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import { PasswordTokenPurpose } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private prisma: PrismaService,
        private mail: MailService,
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
            email: user.email,
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
        if (user.state !== 1) {
            throw new UnauthorizedException("Your account is not active yet. Please set your password from your invite link.");
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

    // ─── Password set / reset ──────────────────────────────────────────────

    private appUrl(): string {
        return (process.env.APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3001').replace(/\/$/, '');
    }

    private hashToken(raw: string): string {
        return createHash('sha256').update(raw).digest('hex');
    }

    /// Issues a single-use, expiring token, invalidating any earlier outstanding
    /// tokens of the same purpose. Only the sha256 hash is stored; the raw token
    /// (returned here) travels in the emailed link.
    private async issueToken(userId: string, purpose: PasswordTokenPurpose, ttlMs: number): Promise<string> {
        const raw = randomBytes(32).toString('hex');
        await this.prisma.passwordToken.updateMany({
            where: { userId, purpose, usedAt: null },
            data: { usedAt: new Date() },
        });
        await this.prisma.passwordToken.create({
            data: {
                userId,
                tokenHash: this.hashToken(raw),
                purpose,
                expiresAt: new Date(Date.now() + ttlMs),
            },
        });
        return raw;
    }

    /// Creates an invite link so a newly-provisioned employee can set their own
    /// password. Returns the link (also emailed) so the admin flow can surface it.
    async createInvite(userId: string): Promise<string> {
        const raw = await this.issueToken(userId, PasswordTokenPurpose.INVITE, INVITE_TTL_MS);
        const link = `${this.appUrl()}/set-password?token=${raw}`;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user) await this.mail.sendInviteEmail(user.email, link);
        return link;
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (user) {
            const raw = await this.issueToken(user.id, PasswordTokenPurpose.RESET, RESET_TTL_MS);
            const link = `${this.appUrl()}/reset-password?token=${raw}`;
            await this.mail.sendPasswordResetEmail(email, link);
        }
        // Always resolve the same way so the endpoint never reveals whether an
        // account exists for the given email.
    }

    /// Consumes an INVITE or RESET token and sets the user's password (also
    /// activating a pending invited account).
    async setPasswordFromToken(token: string, password: string): Promise<void> {
        const record = await this.prisma.passwordToken.findUnique({
            where: { tokenHash: this.hashToken(token) },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new BadRequestException('This link is invalid or has expired');
        }
        const hashed = await bcrypt.hash(password, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.userId },
                data: { password: hashed, state: 1 },
            }),
            // Burn every outstanding token for this user (single-use).
            this.prisma.passwordToken.updateMany({
                where: { userId: record.userId, usedAt: null },
                data: { usedAt: new Date() },
            }),
        ]);
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) throw new BadRequestException('Current password is incorrect');
        const hashed = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    }
}
