import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Department, PlayerStatus, Prisma, RGLimitStatus, RGLimitType, RiskLevel, Role } from '@prisma/client';
import { ActingUser, assertDepartment, assertMinRole } from '../auth/authorization.helper';

// ---- Account: alta, búsqueda, datos personales, estado, balances, restricciones, riesgo AML, notas ----

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(email: string, firstName: string, lastName: string) {
    const existing = await this.prisma.player.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya existe un jugador con ese email');

    return this.prisma.player.create({
      data: { email, firstName, lastName },
    });
  }

  async findAll(search?: string) {
    return this.prisma.player.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        _count: { select: { notes: true } },
        kyc: { select: { idDocStatus: true, poaDocStatus: true, sofDocStatus: true } },
        rgLimits: {
          where: { type: RGLimitType.SELF_EXCLUSION, status: RGLimitStatus.ACTIVE },
          select: { id: true },
        },
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
        kyc: true,
        payments: { orderBy: { createdAt: 'desc' } },
        bonuses: {
          include: { grantedBy: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        rgLimits: { orderBy: { createdAt: 'desc' } },
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            department: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        loginHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!player) throw new NotFoundException('Jugador no encontrado');
    return player;
  }

  async update(id: number, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: string;
    nationality?: string;
    country?: string;
    city?: string;
    address?: string;
    language?: string;
    tags?: string[];
  }) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.player.update({
      where: { id },
      data,
    });
  }

  // Transición de estado disparada por el propio sistema (autoexclusión al crear un límite RG,
  // reactivación automática del cron) — sin usuario actuando, por eso no pasa por assertDepartment/assertMinRole.
  // Pública porque PlayersRgService la usa para esas dos transiciones; acepta un `tx` opcional para
  // poder ejecutarse dentro de la misma transacción que la creación/expiración del límite RG.
  async applyStatusTransition(id: number, status: PlayerStatus, tx: Prisma.TransactionClient = this.prisma) {
    const player = await tx.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    let restrictions: Record<string, boolean> = {};

    if (status === PlayerStatus.ACTIVE) {
      restrictions = {
        canDeposit: true,
        canWithdraw: true,
        canBet: true,
        canReceiveBonus: true,
        canLogin: true,
      };
    } else if (status === PlayerStatus.PENDING_VERIFICATION) {
      restrictions = {
        canDeposit: true,
        canWithdraw: false,
        canBet: true,
        canReceiveBonus: true,
        canLogin: true,
      };
    } else if (status === PlayerStatus.SUSPENDED || status === PlayerStatus.SELF_EXCLUDED) {
      restrictions = {
        canDeposit: false,
        canWithdraw: false,
        canBet: false,
        canReceiveBonus: false,
        canLogin: false,
      };
    }

    return tx.player.update({
      where: { id },
      data: { status, ...restrictions },
    });
  }

  async updateStatus(id: number, status: PlayerStatus, user: ActingUser) {
    assertDepartment(user.role, user.department, [Department.RISK, Department.SUPPORT]);
    assertMinRole(user.role, Role.SUPERVISOR);
    return this.applyStatusTransition(id, status);
  }

  async updateBalances(id: number, realBalance?: number, bonusBalance?: number) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.player.update({
      where: { id },
      data: {
        ...(realBalance !== undefined && { realBalance }),
        ...(bonusBalance !== undefined && { bonusBalance }),
      },
    });
  }

  async updateRestrictions(id: number, data: {
    canDeposit?: boolean;
    canWithdraw?: boolean;
    canBet?: boolean;
    canReceiveBonus?: boolean;
    canLogin?: boolean;
  }) {
    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.player.update({
      where: { id },
      data,
    });
  }

  async updateRisk(id: number, data: {
    riskLevel?: RiskLevel;
    isPEP?: boolean;
    sofVerified?: boolean;
    riskNotes?: string;
  }, user: ActingUser) {
    assertDepartment(user.role, user.department, Department.RISK);
    assertMinRole(user.role, Role.SUPERVISOR);

    const player = await this.prisma.player.findUnique({ where: { id } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.player.update({
      where: { id },
      data,
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

  async getLoginHistory(playerId: number) {
    return this.prisma.playerLoginHistory.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
