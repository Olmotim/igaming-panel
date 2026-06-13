import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(
    title: string,
    description: string,
    department: string,
    priority: string,
    createdById: number,
    playerId?: number,
    assignedToId?: number,
  ) {
    return this.prisma.ticket.create({
      data: {
        title,
        description,
        department,
        priority,
        createdById,
        playerId,
        assignedToId,
      },
      include: this.ticketIncludes(),
    });
  }

  async findAll(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    createdById?: number;
    assignedToId?: number;
  }) {
    return this.prisma.ticket.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.department && { department: filters.department }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.createdById && { createdById: filters.createdById }),
        ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
      },
      include: this.ticketIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...this.ticketIncludes(),
        comments: {
          include: {
            author: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async updateStatus(id: number, status: string, userId: number) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    const resolvedAt = status === 'RESOLVED' ? new Date() : ticket.resolvedAt;

    return this.prisma.ticket.update({
      where: { id },
      data: { status, resolvedAt },
      include: this.ticketIncludes(),
    });
  }

  async update(id: number, data: {
    title?: string;
    description?: string;
    priority?: string;
    department?: string;
    assignedToId?: number;
  }) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.ticket.update({
      where: { id },
      data,
      include: this.ticketIncludes(),
    });
  }

  async addComment(ticketId: number, content: string, authorId: number) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.ticketComment.create({
      data: { content, ticketId, authorId },
      include: {
        author: { select: { id: true, email: true } },
      },
    });
  }

  private ticketIncludes() {
    return {
      createdBy: { select: { id: true, email: true } },
      assignedTo: { select: { id: true, email: true } },
      player: { select: { id: true, name: true, email: true } },
    };
  }
}