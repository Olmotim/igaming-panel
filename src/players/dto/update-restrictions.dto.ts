import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRestrictionsDto {
  @IsOptional()
  @IsBoolean()
  canDeposit?: boolean;

  @IsOptional()
  @IsBoolean()
  canWithdraw?: boolean;

  @IsOptional()
  @IsBoolean()
  canBet?: boolean;

  @IsOptional()
  @IsBoolean()
  canReceiveBonus?: boolean;

  @IsOptional()
  @IsBoolean()
  canLogin?: boolean;
}
