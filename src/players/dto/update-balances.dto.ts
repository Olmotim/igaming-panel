import { IsNumber, IsOptional } from 'class-validator';

export class UpdateBalancesDto {
  @IsOptional()
  @IsNumber()
  realBalance?: number;

  @IsOptional()
  @IsNumber()
  bonusBalance?: number;
}
