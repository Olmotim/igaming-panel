import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
        where: { type: 'SELF_EXCLUSION', status: 'ACTIVE' },
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

async updateStatus(id: number, status: string) {
  const player = await this.prisma.player.findUnique({ where: { id } });
  if (!player) throw new NotFoundException('Jugador no encontrado');

  let restrictions: Record<string, boolean> = {};

  if (status === 'active') {
    restrictions = {
      canDeposit: true,
      canWithdraw: true,
      canBet: true,
      canReceiveBonus: true,
      canLogin: true,
    };
  } else if (status === 'pending_verification') {
    restrictions = {
      canDeposit: true,
      canWithdraw: false,
      canBet: true,
      canReceiveBonus: true,
      canLogin: true,
    };
  } else if (status === 'suspended') {
    restrictions = {
      canDeposit: false,
      canWithdraw: false,
      canBet: false,
      canReceiveBonus: false,
      canLogin: false,
    };
  }

  return this.prisma.player.update({
    where: { id },
    data: { status, ...restrictions },
  });
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
    riskLevel?: string;
    isPEP?: boolean;
    sofVerified?: boolean;
    riskNotes?: string;
  }) {
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

  // ---- KYC ----

  async getKYC(playerId: number) {
    const kyc = await this.prisma.playerKYC.findUnique({
      where: { playerId },
      include: { reviewedBy: { select: { id: true, email: true } } },
    });
    return kyc;
  }

  async upsertKYC(playerId: number, data: {
    kycLevel?: string;
    idDocType?: string;
    idDocNumber?: string;
    idDocExpiry?: Date;
    idDocIssuingCountry?: string;
    idDocStatus?: string;
    idDocUrl?: string;
    poaDocType?: string;
    poaDocStatus?: string;
    poaDocUrl?: string;
    sofDocStatus?: string;
    sofDocUrl?: string;
    sofDescription?: string;
    pepStatus?: string;
    pepNotes?: string;
  }, reviewedById: number) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerKYC.upsert({
      where: { playerId },
      update: { ...data, reviewedAt: new Date(), reviewedById },
      create: { ...data, playerId, reviewedAt: new Date(), reviewedById },
    });
  }

  // ---- Payments ----

  async getPayments(playerId: number) {
    return this.prisma.playerPayment.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addPayment(playerId: number, data: {
    type: string;
    amount: number;
    currency?: string;
    status?: string;
    paymentMethod?: string;
    accountNumber?: string;
    reference?: string;
    notes?: string;
  }) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerPayment.create({
      data: { ...data, playerId },
    });
  }

async updatePaymentStatus(paymentId: number, status: string) {
  const payment = await this.prisma.playerPayment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundException('Pago no encontrado');

  const wasApproved = payment.status === 'APPROVED';
  const willBeApproved = status === 'APPROVED';

  const updated = await this.prisma.playerPayment.update({
    where: { id: paymentId },
    data: {
      status,
      processedAt: status !== 'PENDING' ? new Date() : payment.processedAt,
    },
  });

  // Actualizar balance solo si el estado de aprobación cambia
  if (!wasApproved && willBeApproved) {
    const delta = payment.type === 'DEPOSIT' ? payment.amount : -payment.amount;
    await this.prisma.player.update({
      where: { id: payment.playerId },
      data: { realBalance: { increment: delta } },
    });
  } else if (wasApproved && !willBeApproved) {
    // Si se revierte una aprobación, deshacer el efecto en balance
    const delta = payment.type === 'DEPOSIT' ? -payment.amount : payment.amount;
    await this.prisma.player.update({
      where: { id: payment.playerId },
      data: { realBalance: { increment: delta } },
    });
  }

  return updated;
}

  // ---- Bonuses ----

  async getBonuses(playerId: number) {
    return this.prisma.playerBonus.findMany({
      where: { playerId },
      include: { grantedBy: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

async addBonus(playerId: number, data: {
  type: string;
  description?: string;
  amount: number;
  wagering?: number;
  maxWinAmount?: number;
  expiresAt?: Date;
}, grantedById: number) {
  const player = await this.prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new NotFoundException('Jugador no encontrado');

  const bonus = await this.prisma.playerBonus.create({
    data: { ...data, playerId, grantedById },
    include: { grantedBy: { select: { id: true, email: true } } },
  });

  await this.prisma.player.update({
    where: { id: playerId },
    data: { bonusBalance: { increment: data.amount } },
  });

  return bonus;
}

async updateBonusStatus(bonusId: number, status: string) {
  const bonus = await this.prisma.playerBonus.findUnique({ where: { id: bonusId } });
  if (!bonus) throw new NotFoundException('Bono no encontrado');

  const wasActive = bonus.status === 'ACTIVE';
  const willBeInactive = status === 'CANCELLED' || status === 'EXPIRED';

  const updated = await this.prisma.playerBonus.update({
    where: { id: bonusId },
    data: {
      status,
      claimedAt: status === 'CLAIMED' ? new Date() : bonus.claimedAt,
    },
  });

  // Si el bono deja de estar activo (cancelado/expirado), se quita del bonusBalance
  if (wasActive && willBeInactive) {
    await this.prisma.player.update({
      where: { id: bonus.playerId },
      data: { bonusBalance: { decrement: bonus.amount } },
    });
  }

  return updated;
}

  // ---- Responsible Gaming ----

  async getRGLimits(playerId: number) {
    return this.prisma.playerRGLimit.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addRGLimit(playerId: number, data: {
    type: string;
    period?: string;
    amount?: number;
    duration?: number;
    endDate?: Date;
    coolingOffUntil?: Date;
    excludedUntil?: Date;
    therapyFlag?: boolean;
  }) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerRGLimit.create({
      data: { ...data, playerId, requestedAt: new Date() },
    });
  }

  async updateRGLimitStatus(limitId: number, status: string) {
    const limit = await this.prisma.playerRGLimit.findUnique({ where: { id: limitId } });
    if (!limit) throw new NotFoundException('Límite no encontrado');

    return this.prisma.playerRGLimit.update({
      where: { id: limitId },
      data: { status },
    });
  }

  // ---- Login History ----

  async getLoginHistory(playerId: number) {
    return this.prisma.playerLoginHistory.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}