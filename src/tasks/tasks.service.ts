import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async verifyMember(workspaceId: number, userId: number) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new ForbiddenException('No tienes acceso a este workspace');
    return member;
  }

  async create(workspaceId: number, title: string, description: string | undefined, assignedTo: number | undefined, userId: number) {
    await this.verifyMember(workspaceId, userId);

    return this.prisma.task.create({
      data: {
        title,
        description,
        assignedTo,
        workspaceId,
      },
    });
  }

  async findAll(workspaceId: number, userId: number) {
    await this.verifyMember(workspaceId, userId);

    return this.prisma.task.findMany({
      where: { workspaceId },
      include: {
        assignee: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(taskId: number, status: string, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    await this.verifyMember(task.workspaceId, userId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: { status },
    });
  }

  async remove(taskId: number, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: task.workspaceId } },
    });

    if (!member || member.role !== 'owner') {
      throw new ForbiddenException('Solo el owner puede eliminar tareas');
    }

    return this.prisma.task.delete({ where: { id: taskId } });
  }
}