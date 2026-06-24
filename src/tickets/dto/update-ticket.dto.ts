import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Department, TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsInt()
  assignedToId?: number;
}
