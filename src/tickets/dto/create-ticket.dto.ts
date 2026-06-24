import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Department, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(Department)
  department: Department;

  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @IsOptional()
  @IsInt()
  playerId?: number;

  @IsOptional()
  @IsInt()
  assignedToId?: number;
}
