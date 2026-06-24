import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlayerStatus, RGLimitPeriod, RGLimitStatus, RGLimitType } from '@prisma/client';
import { PlayersService } from './players.service';

@Injectable()
export class PlayersRgService {
  constructor(
    private prisma: PrismaService,
    private playersService: PlayersService,
  ) {}

  async getRGLimits(playerId: number) {
    return this.prisma.playerRGLimit.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addRGLimit(playerId: number, data: {
    type: RGLimitType;
    period?: RGLimitPeriod;
    amount?: number;
    duration?: number;
    endDate?: Date;
    coolingOffUntil?: Date;
    excludedUntil?: Date;
    therapyFlag?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) throw new NotFoundException('Jugador no encontrado');

      const limit = await tx.playerRGLimit.create({
        data: { ...data, playerId, requestedAt: new Date() },
      });

      if (data.type === RGLimitType.SELF_EXCLUSION) {
        await this.playersService.applyStatusTransition(playerId, PlayerStatus.SELF_EXCLUDED, tx);
      }

      return limit;
    });
  }

  async updateRGLimitStatus(limitId: number, status: RGLimitStatus) {
    const limit = await this.prisma.playerRGLimit.findUnique({ where: { id: limitId } });
    if (!limit) throw new NotFoundException('Límite no encontrado');

    return this.prisma.playerRGLimit.update({
      where: { id: limitId },
      data: { status },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkExpiredExclusions() {
    const now = new Date();

    const expired = await this.prisma.playerRGLimit.findMany({
      where: {
        type: RGLimitType.SELF_EXCLUSION,
        status: RGLimitStatus.ACTIVE,
        excludedUntil: { lte: now },
      },
    });

    for (const limit of expired) {
      // Una transacción por límite: si falla la reactivación de un jugador, no debe afectar a los demás del lote.
      await this.prisma.$transaction(async (tx) => {
        await tx.playerRGLimit.update({
          where: { id: limit.id },
          data: { status: RGLimitStatus.EXPIRED },
        });

        await this.playersService.applyStatusTransition(limit.playerId, PlayerStatus.ACTIVE, tx);
      });
    }

    return { reactivated: expired.length };
  }
}
