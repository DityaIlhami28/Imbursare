import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  amount?: string;

  @IsString()
  category?: string;


  @IsOptional()
  @IsString()
  unit?: string;
}