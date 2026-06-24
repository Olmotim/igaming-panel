import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IdDocStatus, KycLevel, PepStatus, ProofDocStatus } from '@prisma/client';

export class UpsertKycDto {
  @IsOptional()
  @IsEnum(KycLevel)
  kycLevel?: KycLevel;

  @IsOptional()
  @IsString()
  idDocType?: string;

  @IsOptional()
  @IsString()
  idDocNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  idDocExpiry?: Date;

  @IsOptional()
  @IsString()
  idDocIssuingCountry?: string;

  @IsOptional()
  @IsEnum(IdDocStatus)
  idDocStatus?: IdDocStatus;

  @IsOptional()
  @IsString()
  idDocUrl?: string;

  @IsOptional()
  @IsString()
  poaDocType?: string;

  @IsOptional()
  @IsEnum(ProofDocStatus)
  poaDocStatus?: ProofDocStatus;

  @IsOptional()
  @IsString()
  poaDocUrl?: string;

  @IsOptional()
  @IsEnum(ProofDocStatus)
  sofDocStatus?: ProofDocStatus;

  @IsOptional()
  @IsString()
  sofDocUrl?: string;

  @IsOptional()
  @IsString()
  sofDescription?: string;

  @IsOptional()
  @IsEnum(PepStatus)
  pepStatus?: PepStatus;

  @IsOptional()
  @IsString()
  pepNotes?: string;
}
