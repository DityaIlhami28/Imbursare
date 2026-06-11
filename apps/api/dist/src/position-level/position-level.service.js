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
exports.PositionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PositionService = class PositionService {
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
    async getPosition(userId) {
        const membership = await this.requireAdminOrFinance(userId);
        const positions = await this.prisma.position.findMany({
            where: { companyId: membership.companyId },
        });
        return positions.map((pos) => ({
            id: pos.id,
            name: pos.name,
            level: pos.level,
        })) || [];
    }
    async getPositionDetails(userId, positionId) {
        await this.requireAdminOrFinance(userId);
        const position = await this.prisma.position.findUnique({
            where: { id: positionId },
            include: { employees: true },
        });
        if (!position) {
            throw new common_1.BadRequestException('Position not found');
        }
        return position;
    }
    async addPosition(userId, name, level, companyId) {
        await this.requireAdminOrFinance(userId);
        const checkExisting = await this.prisma.position.findFirst({
            where: { name, companyId },
        });
        if (checkExisting) {
            throw new common_1.BadRequestException('Position  already exists');
        }
        const positionLevelValue = {
            staff: 1,
            supervisor: 2,
            manager: 3,
            director: 4,
            vp: 5,
            'c-level': 6,
        };
        if (!level) {
            throw new common_1.BadRequestException('positionLevel is required');
        }
        const normalized = level.toLowerCase().trim();
        const levelValue = positionLevelValue[normalized];
        if (!levelValue) {
            throw new common_1.BadRequestException('Invalid position level');
        }
        return this.prisma.position.create({
            data: { name, companyId, level: levelValue },
        });
    }
};
exports.PositionService = PositionService;
exports.PositionService = PositionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PositionService);
//# sourceMappingURL=position-level.service.js.map