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
    positionLevelService;
    constructor(positionLevelService) {
        this.positionLevelService = positionLevelService;
    }
    getPositionLevels(req) {
        return this.positionLevelService.getPositionLevels(req.user.userId);
    }
    addPositionLevel(req, name) {
        return this.positionLevelService.addPositionLevel(req.user.userId, name, req.user.companyId);
    }
    addPositionLevelToUser(req, positionLevel) {
        return this.positionLevelService.addPositionLevelToUser(req.user.userId, positionLevel);
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
], PositionLevelController.prototype, "getPositionLevels", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Post)('create-position-level'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PositionLevelController.prototype, "addPositionLevel", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decarator_1.roles)('ADMIN', 'FINANCE'),
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('positionLevel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PositionLevelController.prototype, "addPositionLevelToUser", null);
exports.PositionLevelController = PositionLevelController = __decorate([
    (0, common_1.Controller)('position-level'),
    __metadata("design:paramtypes", [position_level_service_1.PositionLevelService])
], PositionLevelController);
//# sourceMappingURL=position-level.controller.js.map