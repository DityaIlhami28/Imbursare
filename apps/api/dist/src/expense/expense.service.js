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
exports.ExpenseService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ExpenseService = class ExpenseService {
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
    async getMyExpenses(userId) {
        return this.prisma.expense.findMany({
            where: {
                userId,
            },
        });
    }
    async getCompanyExpensesForAdmin(userId) {
        const membership = await this.requireAdminOrFinance(userId);
        return this.prisma.expense.findMany({
            where: {
                companyId: membership.companyId,
            },
        });
    }
    async getCompanyExpensesForFinance(userId) {
        const membership = await this.requireAdminOrFinance(userId);
        return this.prisma.expense.findMany({
            where: {
                companyId: membership.companyId,
                status: {
                    in: ['APPROVED', 'REIMBURSED']
                }
            },
        });
    }
    async addExpense(userId, amount, description, title, companyId, category) {
        const membership = await this.prisma.membership.findFirst({
            where: { userId },
        });
        if (!membership) {
            throw new common_1.BadRequestException('You are not authorized');
        }
        const categoryRecord = await this.prisma.category.findFirst({
            where: { name: category, companyId },
        });
        if (!categoryRecord) {
            throw new common_1.BadRequestException('Category not found');
        }
        const checkUser = await this.prisma.user.findFirst({
            where: { id: userId },
        });
        if (checkUser) {
            if (!checkUser.positionLevelId) {
                throw new common_1.BadRequestException('Position level not found');
            }
        }
        else {
            throw new common_1.BadRequestException('User not found');
        }
        const checkAmountPolicy = await this.prisma.amountPolicy.findFirst({
            where: {
                companyId,
                positionLevelId: checkUser.positionLevelId,
            },
        });
        if (checkAmountPolicy) {
            if (amount > checkAmountPolicy.maxAmount) {
                throw new common_1.BadRequestException('Amount is over the allowed limit for your position level');
            }
            const checkTotalTransactions = await this.prisma.expense.count({
                where: {
                    userId,
                    status: {
                        notIn: ["REIMBURSED", "REJECTED"]
                    }
                },
            });
            if (checkTotalTransactions >= checkAmountPolicy.totalTransactions) {
                throw new common_1.BadRequestException('You have reached the maximum number of transactions allowed for your position level please wait until your transactions are reviewed by Finance');
            }
        }
        else {
            throw new common_1.BadRequestException('Amount policy not found for your position level');
        }
        const expense = await this.prisma.expense.create({
            data: {
                amount,
                description,
                title,
                userId,
                companyId,
                categoryId: categoryRecord.id,
            },
        });
        await this.prisma.expenseLog.create({
            data: {
                expenseId: expense.id,
                action: expense.status,
                message: `Expense created to draft`,
                createdById: userId,
            },
        });
        return 'Expense created successfully';
    }
};
exports.ExpenseService = ExpenseService;
exports.ExpenseService = ExpenseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpenseService);
//# sourceMappingURL=expense.service.js.map