import { IsOptional, IsString } from 'class-validator';

export class WorkflowExpenseDto {
  @IsOptional()
  @IsString()
  note?: string;
}
