import { IsEnum } from 'class-validator';
import { BonusStatus } from '@prisma/client';

export class UpdateBonusStatusDto {
  @IsEnum(BonusStatus)
  status: BonusStatus;
}
