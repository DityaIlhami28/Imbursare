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
exports.PositionLevelController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decarator_1 = require("../auth/roles/roles.decarator");
const roles_guard_1 = require("../auth/roles/roles.guard");
const position_level_service_1 = require("./position-level.service");
let PositionLevelController = class PositionLevelController {
    positionService;
    constructor(positionService) {
        this.positionService = positionService;
    }
    getPosition(req) {
        return this.positionService.getPosition(req.user.userId);
    }
    addPosition(req, name, level) {
        return this.positionService.addPosition(req.user.userId, name, level, req.user.companyId);
    }
    getPositionDetails(req) {
        const positionId = req.params.id;
        return this.positionService.getPositionDetails(req.user.userId, positionId);
    }
};
exports.PositionLevelController = PositionLevelController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PositionLevelController.prototype, "getPosition", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Post)('create-position'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('name')),
    __param(2, (0, common_1.Body)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PositionLevelController.prototype, "addPosition", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PositionLevelController.prototype, "getPositionDetails", null);
exports.PositionLevelController = PositionLevelController = __decorate([
    (0, common_1.Controller)('positions'),
    __metadata("design:paramtypes", [position_level_service_1.PositionService])
], PositionLevelController);
//# sourceMappingURL=position-level.controller.js.map