import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET || "secretKey",
        });
    }

    async validate(payload: any) {
        // Resolve the caller's role live from their membership so a demotion or
        // removal from the company takes effect immediately instead of lingering
        // until the token expires. Users with no company context yet (e.g. right
        // after registering) pass through with no role.
        let role = payload.role;
        if (payload.companyId) {
            const membership = await this.prisma.membership.findFirst({
                where: { userId: payload.sub, companyId: payload.companyId },
                select: { role: true },
            });
            if (!membership) {
                throw new UnauthorizedException("Your access to this company has been revoked");
            }
            role = membership.role;
        }

        return {
            userId: payload.sub,
            email: payload.email,
            companyId: payload.companyId,
            role,
        };
    }
}