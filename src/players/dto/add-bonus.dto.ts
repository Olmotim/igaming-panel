import { IsDate, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BonusType } from '@prisma/client';

export class AddBonusDto {
  @IsEnum(BonusType)
  type: BonusType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsNumber()
  wagering?: number;

  @IsOptional()
  @IsNumber()
  maxWinAmount?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}
