import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

async getUsers() {
  return this.prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      department: true,
      createdAt: true,
    },
  });
}

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
    this.prisma.ticket.count({ where: { status: 'OPEN' } }),
    this.prisma.ticket.count({ where: { priority: 'URGENT', status: { not: 'CLOSED' } } }),
    this.prisma.ticket.count({
      where: {
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    this.prisma.player.count({ where: { status: 'pending_verification' } }),
    this.prisma.ticket.findMany({
      where: { assignedToId: userId, status: { notIn: ['RESOLVED', 'CLOSED'] } },
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
      where: { status: { notIn: ['RESOLVED', 'CLOSED'] } },
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

async updateUserDepartment(id: number, department: string) {
  return this.prisma.user.update({
    where: { id },
    data: { department: department.toUpperCase() },
    select: { id: true, email: true, role: true, department: true },
  });
}
}