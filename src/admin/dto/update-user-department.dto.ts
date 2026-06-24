import { IsEnum } from 'class-validator';
import { Department } from '@prisma/client';

export class UpdateUserDepartmentDto {
  @IsEnum(Department)
  department: Department;
}
