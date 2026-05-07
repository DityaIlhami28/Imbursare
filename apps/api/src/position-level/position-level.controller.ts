import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { roles } from '../auth/roles/roles.decarator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { PositionLevelService } from './position-level.service';

@Controller('position-level')
export class PositionLevelController {
  constructor(private readonly positionLevelService: PositionLevelService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Get()
  getPositionLevels(@Request() req) {
    return this.positionLevelService.getPositionLevels(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Post('create-position-level')
  addPositionLevel(@Request() req, @Body('name') name: string) {
    return this.positionLevelService.addPositionLevel(req.user.userId, name, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Post('assign')
  addPositionLevelToUser(@Request() req, @Body('positionLevel') positionLevel: string) {
    return this.positionLevelService.addPositionLevelToUser(req.user.userId, positionLevel);
  }
}
