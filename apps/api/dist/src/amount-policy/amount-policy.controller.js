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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmountPolicyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles/roles.guard");
const roles_decarator_1 = require("../auth/roles/roles.decarator");
const amount_policy_service_1 = require("./amount-policy.service");
let AmountPolicyController = class AmountPolicyController {
    amountPolicyService;
    constructor(amountPolicyService) {
        this.amountPolicyService = amountPolicyService;
    }
    getAmountPolicies(req) {
        return this.amountPolicyService.getAmountPolicies(req.user.userId);
    }
    addAmountPolicy(req, amountPolicyData) {
        return this.amountPolicyService.addAmountPolicy(req.user.userId, amountPolicyData.name, amountPolicyData.minAmount, amountPolicyData.maxAmount, amountPolicyData.positionLevel, amountPolicyData.totalTransactions, req.user.companyId);
    }
};
exports.AmountPolicyController = AmountPolicyController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AmountPolicyController.prototype, "getAmountPolicies", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Post)('create-amount-policy'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AmountPolicyController.prototype, "addAmountPolicy", null);
exports.AmountPolicyController = AmountPolicyController = __decorate([
    (0, common_1.Controller)('amount-policy'),
    __metadata("design:paramtypes", [amount_policy_service_1.AmountPolicyService])
], AmountPolicyController);
//# sourceMappingURL=amount-policy.controller.js.map