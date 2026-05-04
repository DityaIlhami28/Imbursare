import { Controller, UseGuards, Request, Post, Body } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { roles } from '@/auth/roles/roles.decarator';
import { RolesGuard } from '@/auth/roles/roles.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddUserDto } from './dto/add-user.dto';
@Controller('companies')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Request() req, @Body() body: CreateCompanyDto) {
        return this.companyService.createCompany(req.user.userId, body.name);
    }
    @UseGuards(JwtAuthGuard, RolesGuard)
    @roles('ADMIN')
    @Post('add-user')
    addUser(@Request() req, @Body() body: AddUserDto) {
        return this.companyService.addUserToCompany(req.user.companyId, body.email, body.role);
    }
}
