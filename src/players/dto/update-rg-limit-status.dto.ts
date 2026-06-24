import { IsEnum } from 'class-validator';
import { RGLimitStatus } from '@prisma/client';

export class UpdateRgLimitStatusDto {
  @IsEnum(RGLimitStatus)
  status: RGLimitStatus;
}
