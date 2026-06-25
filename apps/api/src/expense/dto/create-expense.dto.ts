import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  Min,
  isString,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  amount?: number;

  @IsString()
  category?: string;


  @IsOptional()
  @IsString()
  unit?: string;

}