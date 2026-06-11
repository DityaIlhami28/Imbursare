import { Controller, Get, UseGuards, Request, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { roles } from '../auth/roles/roles.decarator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { PositionService } from './position-level.service';

@Controller('positions')
export class PositionLevelController {
  constructor(private readonly positionService: PositionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Get()
  getPosition(@Request() req) {
    return this.positionService.getPosition(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Post('create-position')
  addPosition(@Request() req, @Body('name') name: string, @Body('level') level: string) {
    return this.positionService.addPosition(req.user.userId, name, level, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Get(':id')
  getPositionDetails(@Request() req) {
    const positionId = req.params.id;
    return this.positionService.getPositionDetails(req.user.userId, positionId);
  }
}
