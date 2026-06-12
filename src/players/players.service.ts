import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(email: string, name: string) {
    const existing = await this.prisma.player.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya existe un jugador con ese email');

    return this.prisma.player.create({
      data: { email, name },
    });
  }

  async findAll(search?: string) {
    return this.prisma.player.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        _count: { select: { notes: true } },
      },
    });
  }

  async findOne(id: number) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        notes: {
          include: {
            author: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');
    return player;
  }

  async updateStatus(id: number, status: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.player.update({
      where: { id },
      data: { status },
    });
  }

  async addNote(playerId: number, content: string, authorId: number) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerNote.create({
      data: { content, playerId, authorId },
      include: {
        author: { select: { id: true, email: true } },
      },
    });
  }
}