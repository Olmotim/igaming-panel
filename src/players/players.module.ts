import { Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayersKycService } from './players-kyc.service';
import { PlayersPaymentsService } from './players-payments.service';
import { PlayersBonusesService } from './players-bonuses.service';
import { PlayersRgService } from './players-rg.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PlayersController],
  providers: [
    PlayersService,
    PlayersKycService,
    PlayersPaymentsService,
    PlayersBonusesService,
    PlayersRgService,
    PrismaService,
  ],
})
export class PlayersModule {}
