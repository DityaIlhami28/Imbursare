import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { roles } from '../auth/roles/roles.decarator';
import { AmountPolicyService } from './amount-policy.service';

@Controller('amount-policy')
export class AmountPolicyController {
  constructor(private readonly amountPolicyService: AmountPolicyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Get()
  getAmountPolicies(@Request() req) {
    return this.amountPolicyService.getAmountPolicies(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Post('create-amount-policy')
  addAmountPolicy(@Request() req, @Body() amountPolicyData: any) {
    return this.amountPolicyService.addAmountPolicy(
      req.user.userId,
      amountPolicyData.name,
      amountPolicyData.minAmount,
      amountPolicyData.maxAmount,
      amountPolicyData.positionLevel,
      amountPolicyData.totalTransactions,
      req.user.companyId
    );
  }
}
