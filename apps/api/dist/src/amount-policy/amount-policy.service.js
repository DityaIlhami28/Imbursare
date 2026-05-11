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
exports.AmountPolicyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AmountPolicyService = class AmountPolicyService {
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
    async getAmountPolicies(userId) {
        const membership = await this.requireAdminOrFinance(userId);
        return this.prisma.amountPolicy.findMany({
            where: {
                companyId: membership.companyId,
            },
        });
    }
    async addAmountPolicy(userId, name, minAmount, maxAmount, positionLevel, totalTransactions, companyId) {
        await this.requireAdminOrFinance(userId);
        const checkExisting = await this.prisma.amountPolicy.findFirst({
            where: { name, companyId },
        });
        if (checkExisting) {
            throw new common_1.BadRequestException('Amount policy already exists');
        }
        const positionLevelRecord = await this.prisma.positionLevel.findFirst({
            where: { name: positionLevel },
        });
        if (!positionLevelRecord) {
            throw new common_1.BadRequestException('Position level not found');
        }
        const positionLevelId = positionLevelRecord.id;
        return this.prisma.amountPolicy.create({
            data: { name, minAmount, maxAmount, positionLevelId, totalTransactions, companyId },
        });
    }
};
exports.AmountPolicyService = AmountPolicyService;
exports.AmountPolicyService = AmountPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AmountPolicyService);
//# sourceMappingURL=amount-policy.service.js.map