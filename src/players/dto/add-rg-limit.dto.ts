import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { RGLimitPeriod, RGLimitType } from '@prisma/client';

export class AddRgLimitDto {
  @IsEnum(RGLimitType)
  type: RGLimitType;

  @IsOptional()
  @IsEnum(RGLimitPeriod)
  period?: RGLimitPeriod;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  coolingOffUntil?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  excludedUntil?: Date;

  @IsOptional()
  @IsBoolean()
  therapyFlag?: boolean;
}
