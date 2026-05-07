import { CompanyRole } from "@prisma/client";
import { IsEmail, IsEnum, IsString } from "class-validator";

export class AddUserDto {
  @IsEmail()
  email!: string;

  @IsEnum(CompanyRole)
  role!: CompanyRole;

  @IsString()
  positionLevel!: string;

  @IsString()
  fullName!: string;
}