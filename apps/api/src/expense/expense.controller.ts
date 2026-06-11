import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { roles } from '../auth/roles/roles.decarator';
import { ExpenseService } from './expense.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('create-expense')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 4 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const isImage = file.mimetype.startsWith('image/');
        if (isImage || allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only images, PDFs, and Word documents are allowed',
            ),
            false,
          );
        }
      },
    }),
  ) // Add any necessary interceptors here
  async addExpense(
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateExpenseDto,
  ) {
    return await this.expenseService.addExpense(
      dto,
      req.user.userId,
      req.user.companyId,
      files,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('my-expenses')
  async getMyExpenses(@Request() req) {
    return await this.expenseService.getMyExpenses(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN')
  @Get('company-expenses-for-admin')
  async getCompanyExpensesForAdmin(@Request() req) {
    return await this.expenseService.getCompanyExpensesForAdmin(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('FINANCE')
  @Get('company-expenses-for-finance')
  async getCompanyExpensesForFinance(@Request() req) {
    return await this.expenseService.getCompanyExpensesForFinance(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async getExpenseDetails(@Request() req) {
    return await this.expenseService.getExpenseDetails(req.params.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('logs/:id')
  async getExpenseLogs(@Request() req) {
    return await this.expenseService.getExpenseLogs(req.params.id, req.user.id);
  }
}
