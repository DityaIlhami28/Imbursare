"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roles = void 0;
const common_1 = require("@nestjs/common");
const roles = (...roles) => (0, common_1.SetMetadata)('roles', roles);
exports.roles = roles;
//# sourceMappingURL=roles.decarator.js.map