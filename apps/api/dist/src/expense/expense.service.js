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
const upload_service_1 = require("../storage/upload.service");
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
        const myExpenses = await this.prisma.expense.findMany({
            where: {
                userId,
            },
        });
        return myExpenses.map((expense) => ({
            id: expense.id,
            title: expense.title,
            amount: expense.amount,
            status: expense.status,
            createdAt: expense.createdAt,
        })) || [];
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
        const checkUnit = await this.prisma.employee.findFirst({
            where: { userId },
        });
        if (!checkUnit || !checkUnit.unit) {
            throw new common_1.BadRequestException('Unit not found for this user');
        }
        return this.prisma.expense.findMany({
            where: {
                unit: checkUnit.unit,
                companyId: membership.companyId,
                status: {
                    in: ['APPROVED', 'REIMBURSED'],
                },
            },
        }) || [];
    }
    async addExpense(dto, userId, companyId, files) {
        const membership = await this.prisma.membership.findFirst({
            where: { userId },
        });
        const amount = Number(dto.amount);
        if (!membership) {
            throw new common_1.BadRequestException('You are not authorized');
        }
        const categoryRecord = await this.prisma.category.findFirst({
            where: { name: dto.category, companyId: companyId },
        });
        if (!categoryRecord) {
            throw new common_1.BadRequestException('Category not found');
        }
        const checkUser = await this.prisma.user.findFirst({
            where: { id: userId },
        });
        if (!checkUser) {
            throw new common_1.BadRequestException('User not found');
        }
        const checkEmployee = await this.prisma.employee.findFirst({
            where: { userId },
        });
        if (!checkEmployee) {
            throw new common_1.BadRequestException('Employee not found');
        }
        if (!checkEmployee.positionId) {
            throw new common_1.BadRequestException('Position not found');
        }
        if (!checkEmployee.unit) {
            throw new common_1.BadRequestException('Unit not found');
        }
        const checkLevelEmployee = await this.prisma.position.findFirst({
            where: { id: checkEmployee.positionId },
        });
        if (!checkLevelEmployee) {
            throw new common_1.BadRequestException('Position not found');
        }
        const checkAmountPolicy = await this.prisma.amountPolicy.findFirst({
            where: {
                companyId: companyId,
                level: checkLevelEmployee.level,
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
                        in: ['DRAFT', 'SUBMIT', 'APPROVED'],
                    },
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
                amount: amount,
                description: dto.description ?? '',
                title: dto.title ?? '',
                userId: userId,
                companyId: companyId,
                categoryId: categoryRecord.id,
                unit: checkEmployee.unit ?? undefined,
            },
        });
        if (files && files.length > 0) {
            files.forEach((file) => {
                if (file.size > 4 * 1024 * 1024) {
                    throw new common_1.BadRequestException('File size should be less than 4MB');
                }
                const IsImage = file.mimetype.startsWith('image/');
                const IsPdf = file.mimetype === 'application/pdf';
                const IsDocx = file.mimetype ===
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                if (!IsImage && !IsPdf && !IsDocx) {
                    throw new common_1.BadRequestException(`File ${file.originalname} has an invalid type. Only images, PDFs, and Word documents are allowed`);
                }
            });
            const uploaded = await Promise.all(files.map((file) => (0, upload_service_1.uploadToR2)(file)));
            await this.prisma.expenseAttachment.createMany({
                data: uploaded.map((file, i) => ({
                    expenseId: expense.id,
                    fileName: files[i].originalname,
                    fileUrl: file.url,
                    fileType: files[i].mimetype,
                    size: files[i].size,
                })),
            });
        }
        await this.prisma.expenseLog.create({
            data: {
                expenseId: expense.id,
                action: expense.status,
                message: `Expense created to draft`,
                createdById: userId,
            },
        });
        return {
            message: 'Expense created successfully',
            expenseId: expense.id,
            status: expense.status,
        };
    }
    async getExpenseDetails(expenseId) {
        const expenseDetails = await this.prisma.expense.findUnique({
            where: {
                id: expenseId,
            },
            include: {
                attachments: true,
                category: true,
            },
        });
        if (!expenseDetails) {
            throw new common_1.BadRequestException('Expense not found');
        }
        return {
            id: expenseDetails.id,
            title: expenseDetails.title,
            description: expenseDetails.description,
            amount: expenseDetails.amount,
            status: expenseDetails.status,
            attachments: expenseDetails.attachments ? expenseDetails.attachments.map((attachment) => ({
                id: attachment.id,
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                fileType: attachment.fileType,
                size: attachment.size,
            })) : [],
            category: expenseDetails.category ? {
                id: expenseDetails.category.id,
                name: expenseDetails.category.name,
            } : null,
            createdAt: expenseDetails.createdAt,
        };
    }
    async getExpenseLogs(expenseId, userId) {
        const checkUser = await this.prisma.user.findFirst({
            where: { id: userId },
        });
        if (!checkUser) {
            throw new common_1.BadRequestException('User not found');
        }
        const logs = await this.prisma.expenseLog.findMany({
            where: {
                expenseId,
            },
        });
        return logs.map((log) => ({
            id: log.id,
            action: log.action,
            message: log.message,
            createdById: log.createdById,
            createdAt: log.createdAt,
        }));
    }
};
exports.ExpenseService = ExpenseService;
exports.ExpenseService = ExpenseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpenseService);
//# sourceMappingURL=expense.service.js.map