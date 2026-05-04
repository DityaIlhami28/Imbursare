import { Controller, UseGuards, Request, Post, Body, Get } from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { roles } from '@/auth/roles/roles.decarator';


@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard)
  @roles('ADMIN', 'FINANCE')
  @Post('add-category')
  create(@Request() req, @Body() body: { name: string }) {
    return this.categoryService.createCategory(req.user.userId, req.user.companyId, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get-categories')
  getCategories(@Request() req) {
    return this.categoryService.getCategories(req.user.companyId);
  }
}
