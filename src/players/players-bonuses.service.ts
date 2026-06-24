import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BonusStatus, BonusType, Department, Role } from '@prisma/client';
import { ActingUser, assertDepartment, assertMinRole } from '../auth/authorization.helper';

@Injectable()
export class PlayersBonusesService {
  constructor(private prisma: PrismaService) {}

  async getBonuses(playerId: number) {
    return this.prisma.playerBonus.findMany({
      where: { playerId },
      include: { grantedBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addBonus(playerId: number, data: {
    type: BonusType;
    description?: string;
    amount: number;
    wagering?: number;
    maxWinAmount?: number;
    expiresAt?: Date;
  }, grantedById: number, user: ActingUser) {
    assertDepartment(user.role, user.department, [Department.PAYMENTS, Department.SUPPORT]);

    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: playerId } });
      if (!player) throw new NotFoundException('Jugador no encontrado');

      const bonus = await tx.playerBonus.create({
        data: { ...data, playerId, grantedById },
        include: { grantedBy: { select: { id: true, email: true } } },
      });

      await tx.player.update({
        where: { id: playerId },
        data: { bonusBalance: { increment: data.amount } },
      });

      return bonus;
    });
  }

  // Igual que addBonus/updatePaymentStatus: status + balance son dos escrituras que deben ser atómicas.
  async updateBonusStatus(bonusId: number, status: BonusStatus, user: ActingUser) {
    assertDepartment(user.role, user.department, [Department.PAYMENTS, Department.SUPPORT]);
    assertMinRole(user.role, Role.SUPERVISOR);

    return this.prisma.$transaction(async (tx) => {
      const bonus = await tx.playerBonus.findUnique({ where: { id: bonusId } });
      if (!bonus) throw new NotFoundException('Bono no encontrado');

      const wasActive = bonus.status === BonusStatus.ACTIVE;
      const willBeInactive = status === BonusStatus.CANCELLED || status === BonusStatus.EXPIRED;

      const updated = await tx.playerBonus.update({
        where: { id: bonusId },
        data: {
          status,
          claimedAt: status === BonusStatus.CLAIMED ? new Date() : bonus.claimedAt,
        },
      });

      // Si el bono deja de estar activo (cancelado/expirado), se quita del bonusBalance
      if (wasActive && willBeInactive) {
        await tx.player.update({
          where: { id: bonus.playerId },
          data: { bonusBalance: { decrement: bonus.amount } },
        });
      }

      return updated;
    });
  }
}
