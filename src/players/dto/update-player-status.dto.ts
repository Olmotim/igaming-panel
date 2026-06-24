import { IsEnum } from 'class-validator';
import { PlayerStatus } from '@prisma/client';

export class UpdatePlayerStatusDto {
  @IsEnum(PlayerStatus)
  status: PlayerStatus;
}
