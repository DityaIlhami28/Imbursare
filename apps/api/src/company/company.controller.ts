import {
  Controller,
  UseGuards,
  Request,
  Post,
  Body,
  Get,
  Patch,
  Param,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { roles } from '@/auth/roles/roles.decarator';
import { RolesGuard } from '@/auth/roles/roles.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AddUserDto } from './dto/add-user.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
@Controller('company')
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
    return this.companyService.addUserToCompany(
      req.user.companyId,
      body.fullName,
      body.email,
      body.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @roles('ADMIN', 'FINANCE')
  @Get('employees')
  getEmployees(@Request() req) {
    return this.companyService.getCompanyEmployees(req.user.companyId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('employee/:id')
  getEmployeeDetails(@Request() req) {
    const employeeId = req.params.id;
    return this.companyService.getEmployeeDetails(
      employeeId,
      req.user.companyId,
    );
  }
}
