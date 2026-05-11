import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { roles } from '../auth/roles/roles.decarator';
import { ExpenseService } from './expense.service';

@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('create-expense')
  async addExpense(@Request() req, @Body() body) {
    return await this.expenseService.addExpense(req.user.userId, body.amount, body.description, body.title, req.user.companyId, body.category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('my-expenses')
  async getMyExpenses(@Request() req) {
    return await this.expenseService.getMyExpenses(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('company-expenses-for-admin')
  async getCompanyExpensesForAdmin(@Request() req) {
    return await this.expenseService.getCompanyExpensesForAdmin(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('company-expenses-for-finance')
  async getCompanyExpensesForFinance(@Request() req) {
    return await this.expenseService.getCompanyExpensesForFinance(req.user.id);
  }
}
