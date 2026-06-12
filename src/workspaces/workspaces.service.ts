import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, userId: number) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
    });
    return workspace;
  }

  async findAllForUser(userId: number) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, role: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });
  }

  async findOne(id: number, userId: number) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, role: true } } },
        },
        tasks: true,
      },
    });

    if (!workspace) throw new NotFoundException('Workspace no encontrado');

    const isMember = workspace.members.some(m => m.userId === userId);
    if (!isMember) throw new ForbiddenException('No tienes acceso a este workspace');

    return workspace;
  }

  async update(id: number, name: string, userId: number) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: id } },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Solo el owner puede editar el workspace');
    }

    return this.prisma.workspace.update({
      where: { id },
      data: { name },
    });
  }

  async remove(id: number, userId: number) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: id } },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Solo el owner puede eliminar el workspace');
    }

    return this.prisma.workspace.delete({ where: { id } });
  }

  async addMember(workspaceId: number, memberEmail: string, userId: number) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Solo el owner puede añadir miembros');
    }

    const newUser = await this.prisma.user.findUnique({
      where: { email: memberEmail },
    });

    if (!newUser) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.workspaceMember.create({
      data: { userId: newUser.id, workspaceId, role: 'member' },
    });
  }
}