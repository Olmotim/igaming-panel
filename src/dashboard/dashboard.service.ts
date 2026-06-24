import { Injectable } from '@nestjs/common';
import { PlayerStatus, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(userId: number) {
    const [
      ticketsOpen,
      ticketsUrgent,
      ticketsResolvedToday,
      playersPendingKYC,
      myTickets,
      recentTickets,
      ticketsByDepartment,
    ] = await Promise.all([
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { priority: TicketPriority.URGENT, status: { not: TicketStatus.CLOSED } } }),
      this.prisma.ticket.count({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.player.count({ where: { status: PlayerStatus.PENDING_VERIFICATION } }),
      this.prisma.ticket.findMany({
        where: { assignedToId: userId, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
        include: {
          createdBy: { select: { id: true, email: true } },
          player: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          createdBy: { select: { id: true, email: true } },
          player: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.ticket.groupBy({
        by: ['department'],
        where: { status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      kpis: {
        ticketsOpen,
        ticketsUrgent,
        ticketsResolvedToday,
        playersPendingKYC,
      },
      myTickets,
      recentTickets,
      ticketsByDepartment: ticketsByDepartment.map(t => ({
        department: t.department,
        count: t._count.id,
      })),
    };
  }
}
