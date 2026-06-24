import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Department, Role, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { assertMinRole, ActingUser } from '../auth/authorization.helper';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async create(
    title: string,
    description: string,
    department: Department,
    priority: TicketPriority,
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

async findAll(userId: number, userRole: Role, userDepartment: Department | null, filters?: {
  status?: TicketStatus;
  department?: Department;
  priority?: TicketPriority;
  createdById?: number;
  assignedToId?: number;
}) {
  const departmentFilter = userRole === Role.ADMIN
    ? filters?.department
    : userDepartment ?? undefined;

  return this.prisma.ticket.findMany({
    where: {
      ...(departmentFilter && { department: departmentFilter }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.createdById && { createdById: filters.createdById }),
      ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
    },
    include: this.ticketIncludes(),
    orderBy: { createdAt: 'desc' },
  });
}

  async findOne(id: number, user: ActingUser) {
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
    this.assertCanAccessTicket(ticket, user);
    return ticket;
  }

  async updateStatus(id: number, status: TicketStatus, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    this.assertCanAccessTicket(ticket, user);

    const resolvedAt = status === TicketStatus.RESOLVED ? new Date() : ticket.resolvedAt;

    return this.prisma.ticket.update({
      where: { id },
      data: { status, resolvedAt },
      include: this.ticketIncludes(),
    });
  }

  async update(id: number, data: {
    title?: string;
    description?: string;
    priority?: TicketPriority;
    department?: Department;
    assignedToId?: number;
  }, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    this.assertCanAccessTicket(ticket, user);

    // Reasignar a otro departamento o agente cruza el ámbito del ticket: requiere SUPERVISOR+
    if (data.department !== undefined || data.assignedToId !== undefined) {
      assertMinRole(user.role, Role.SUPERVISOR);
    }

    return this.prisma.ticket.update({
      where: { id },
      data,
      include: this.ticketIncludes(),
    });
  }

  async addComment(ticketId: number, content: string, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    this.assertCanAccessTicket(ticket, user);

    return this.prisma.ticketComment.create({
      data: { content, ticketId, authorId: user.id },
      include: {
        author: { select: { id: true, email: true } },
      },
    });
  }

private ticketIncludes() {
  return {
    createdBy: { select: { id: true, email: true } },
    assignedTo: { select: { id: true, email: true } },
    player: { select: { id: true, firstName: true, lastName: true, email: true } },
  };
}

private assertCanAccessTicket(
  ticket: { department: Department; createdById: number; assignedToId: number | null },
  user: ActingUser,
) {
  if (user.role === Role.ADMIN) return;
  if (ticket.createdById === user.id || ticket.assignedToId === user.id) return;
  if (user.department === ticket.department) return;
  throw new ForbiddenException('No tienes acceso a este ticket');
}
}
