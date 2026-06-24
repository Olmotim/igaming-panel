import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { RiskLevel } from '@prisma/client';

export class UpdateRiskDto {
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsBoolean()
  isPEP?: boolean;

  @IsOptional()
  @IsBoolean()
  sofVerified?: boolean;

  @IsOptional()
  @IsString()
  riskNotes?: string;
}
