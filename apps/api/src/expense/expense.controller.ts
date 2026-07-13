import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { ExpenseListQuery } from './expense.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { roles } from '../auth/roles/roles.decarator';
import { ExpenseService } from './expense.service';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { WorkflowExpenseDto } from './dto/workflow-expense.dto';

@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('create-expense')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 4 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
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
  )
  async addExpense(
    @Request() req: any,
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

  private parseListQuery(q: any): ExpenseListQuery {
    return {
      page: q?.page ? parseInt(q.page, 10) : undefined,
      pageSize: q?.pageSize ? parseInt(q.pageSize, 10) : undefined,
      search: typeof q?.search === 'string' ? q.search : undefined,
      status: typeof q?.status === 'string' ? q.status : undefined,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('my-expenses')
  async getMyExpenses(@Request() req: any, @Query() q: any) {
    return await this.expenseService.getMyExpenses(req.user.userId, req.user.companyId, this.parseListQuery(q));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN')
  @Get('company-expenses-for-admin')
  async getCompanyExpensesForAdmin(@Request() req: any, @Query() q: any) {
    return await this.expenseService.getCompanyExpensesForAdmin(req.user.userId, req.user.companyId, this.parseListQuery(q));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('FINANCE')
  @Get('company-expenses-for-finance')
  async getCompanyExpensesForFinance(@Request() req: any, @Query() q: any) {
    return await this.expenseService.getCompanyExpensesForFinance(req.user.userId, req.user.companyId, this.parseListQuery(q));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('pending-approvals')
  async getPendingApprovals(@Request() req: any) {
    return await this.expenseService.getPendingApprovals(req.user.userId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('all-approvals')
  async getAllApprovals(@Request() req: any, @Query() q: any) {
    return await this.expenseService.getAllApprovals(req.user.userId, req.user.companyId, this.parseListQuery(q));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async getExpenseDetails(@Request() req: any) {
    return await this.expenseService.getExpenseDetails(req.params.id, req.user.userId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('logs/:id')
  async getExpenseLogs(@Request() req: any) {
    return await this.expenseService.getExpenseLogs(req.params.id, req.user.userId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const isImage = file.mimetype.startsWith('image/');
        if (isImage || allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Only images, PDFs, and Word documents are allowed'), false);
      },
    }),
  )
  async updateExpense(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const dto: UpdateExpenseDto = {};
    if (body.title !== undefined) dto.title = body.title;
    if (body.description !== undefined) dto.description = body.description;
    if (body.amount !== undefined) dto.amount = body.amount;
    if (body.category !== undefined) dto.category = body.category;

    let removeAttachmentIds: string[] | undefined;
    if (body.removeAttachmentIds) {
      removeAttachmentIds = Array.isArray(body.removeAttachmentIds)
        ? body.removeAttachmentIds
        : [body.removeAttachmentIds];
    }

    return this.expenseService.updateExpenseData(
      id, dto, req.user.userId, req.user.companyId, files, removeAttachmentIds,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/submit')
  async submitExpense(@Request() req: any, @Param('id') id: string) {
    return await this.expenseService.submitExpense(id, req.user.userId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/approve')
  async approveExpense(@Request() req: any, @Param('id') id: string, @Body() dto: WorkflowExpenseDto) {
    return await this.expenseService.approveExpense(id, req.user.userId, req.user.companyId, dto.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/reject')
  async rejectExpense(@Request() req: any, @Param('id') id: string, @Body() dto: WorkflowExpenseDto) {
    return await this.expenseService.rejectExpense(id, req.user.userId, req.user.companyId, dto.note);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id/scan-attachments')
  async scanAttachments(@Request() req: any, @Param('id') id: string) {
    return await this.expenseService.scanExpenseAttachments(id, req.user.userId, req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('FINANCE')
  @Patch(':id/finance-reject')
  async financeRejectExpense(@Request() req: any, @Param('id') id: string, @Body() dto: WorkflowExpenseDto) {
    return await this.expenseService.financeRejectExpense(id, req.user.userId, req.user.companyId, dto.note ?? '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN')
  @Patch(':id/force-reject')
  async forceRejectExpense(@Request() req: any, @Param('id') id: string, @Body() dto: WorkflowExpenseDto) {
    return await this.expenseService.forceRejectExpense(id, req.user.userId, req.user.companyId, dto.note ?? '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('scan-receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
        else cb(new BadRequestException('Only image or PDF files can be scanned'), false);
      },
    }),
  )
  async scanReceipt(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return await this.expenseService.scanReceipt(file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/revision')
  async requestRevision(@Request() req: any, @Param('id') id: string, @Body() dto: WorkflowExpenseDto) {
    return await this.expenseService.requestRevision(id, req.user.userId, req.user.companyId, dto.note ?? '');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('FINANCE')
  @Patch(':id/reimburse')
  async reimburseExpense(@Request() req: any, @Param('id') id: string) {
    return await this.expenseService.reimburseExpense(id, req.user.userId, req.user.companyId);
  }
}
