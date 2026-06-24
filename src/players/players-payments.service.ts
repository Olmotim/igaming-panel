import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Department, PaymentStatus, PaymentType, Role } from '@prisma/client';
import { ActingUser, assertDepartment, assertMinRole } from '../auth/authorization.helper';

@Injectable()
export class PlayersPaymentsService {
  constructor(private prisma: PrismaService) {}

  async getPayments(playerId: number) {
    return this.prisma.playerPayment.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addPayment(playerId: number, data: {
    type: PaymentType;
    amount: number;
    currency?: string;
    status?: PaymentStatus;
    paymentMethod?: string;
    accountNumber?: string;
    reference?: string;
    notes?: string;
  }, user: ActingUser) {
    assertDepartment(user.role, user.department, Department.PAYMENTS);

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerPayment.create({
      data: { ...data, playerId },
    });
  }

  async updatePaymentStatus(paymentId: number, status: PaymentStatus, user: ActingUser) {
    assertDepartment(user.role, user.department, Department.PAYMENTS);
    assertMinRole(user.role, Role.SUPERVISOR);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.playerPayment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Pago no encontrado');

      const wasApproved = payment.status === PaymentStatus.APPROVED;
      const willBeApproved = status === PaymentStatus.APPROVED;

      const updated = await tx.playerPayment.update({
        where: { id: paymentId },
        data: {
          status,
          processedAt: status !== PaymentStatus.PENDING ? new Date() : payment.processedAt,
        },
      });

      // Actualizar balance solo si el estado de aprobación cambia
      if (!wasApproved && willBeApproved) {
        const delta = payment.type === PaymentType.DEPOSIT ? payment.amount : -payment.amount;
        await tx.player.update({
          where: { id: payment.playerId },
          data: { realBalance: { increment: delta } },
        });
      } else if (wasApproved && !willBeApproved) {
        // Si se revierte una aprobación, deshacer el efecto en balance
        const delta = payment.type === PaymentType.DEPOSIT ? -payment.amount : payment.amount;
        await tx.player.update({
          where: { id: payment.playerId },
          data: { realBalance: { increment: delta } },
        });
      }

      return updated;
    });
  }
}
