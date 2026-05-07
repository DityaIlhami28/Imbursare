"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PositionLevelService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PositionLevelService = class PositionLevelService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requireAdminOrFinance(userId) {
        const membership = await this.prisma.membership.findFirst({
            where: {
                userId,
                role: { in: [client_1.CompanyRole.ADMIN, client_1.CompanyRole.FINANCE] },
            },
        });
        if (!membership) {
            throw new common_1.BadRequestException('You are not authorized');
        }
        return membership;
    }
    async getPositionLevels(userId) {
        await this.requireAdminOrFinance(userId);
        return this.prisma.positionLevel.findMany();
    }
    async addPositionLevel(userId, name, companyId) {
        await this.requireAdminOrFinance(userId);
        const checkExisting = await this.prisma.positionLevel.findFirst({
            where: { name, companyId },
        });
        if (checkExisting) {
            throw new common_1.BadRequestException('Position level already exists');
        }
        return this.prisma.positionLevel.create({
            data: { name, companyId },
        });
    }
    async addPositionLevelToUser(userId, positionLevel) {
        await this.requireAdminOrFinance(userId);
        const positionLevelRecord = await this.prisma.positionLevel.findFirst({
            where: { name: positionLevel },
        });
        if (!positionLevelRecord) {
            throw new common_1.BadRequestException('Position level not found');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: { positionLevelId: positionLevelRecord.id },
        });
    }
};
exports.PositionLevelService = PositionLevelService;
exports.PositionLevelService = PositionLevelService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PositionLevelService);
//# sourceMappingURL=position-level.service.js.map