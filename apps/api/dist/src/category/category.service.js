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
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let CategoryService = class CategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCategory(userId, companyId, name) {
        const checkMembership = await this.prisma.membership.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (checkMembership?.role !== client_1.CompanyRole.ADMIN &&
            checkMembership?.role !== client_1.CompanyRole.FINANCE) {
            throw new common_1.BadRequestException('You are not an admin/finance of this company');
        }
        const existingCategory = await this.prisma.category.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive',
                },
                companyId,
            },
        });
        if (existingCategory) {
            throw new common_1.BadRequestException('Category already exists');
        }
        return this.prisma.category.create({
            data: {
                name,
                companyId,
            },
        });
    }
    async getCategories(companyId) {
        return this.prisma.category.findMany({
            where: {
                companyId,
            },
        });
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoryService);
//# sourceMappingURL=category.service.js.map