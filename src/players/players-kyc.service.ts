import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Department, IdDocStatus, KycLevel, PepStatus, ProofDocStatus, Role } from '@prisma/client';
import { ActingUser, assertDepartment, assertMinRole } from '../auth/authorization.helper';

function isKycDecision(data: {
  idDocStatus?: IdDocStatus;
  poaDocStatus?: ProofDocStatus;
  sofDocStatus?: ProofDocStatus;
  pepStatus?: PepStatus;
}): boolean {
  return (
    data.idDocStatus === IdDocStatus.APPROVED || data.idDocStatus === IdDocStatus.REJECTED ||
    data.poaDocStatus === ProofDocStatus.VERIFIED || data.poaDocStatus === ProofDocStatus.REJECTED ||
    data.sofDocStatus === ProofDocStatus.VERIFIED || data.sofDocStatus === ProofDocStatus.REJECTED ||
    data.pepStatus === PepStatus.PEP
  );
}

@Injectable()
export class PlayersKycService {
  constructor(private prisma: PrismaService) {}

  async getKYC(playerId: number) {
    const kyc = await this.prisma.playerKYC.findUnique({
      where: { playerId },
      include: { reviewedBy: { select: { id: true, email: true } } },
    });
    return kyc;
  }

  async upsertKYC(playerId: number, data: {
    kycLevel?: KycLevel;
    idDocType?: string;
    idDocNumber?: string;
    idDocExpiry?: Date;
    idDocIssuingCountry?: string;
    idDocStatus?: IdDocStatus;
    idDocUrl?: string;
    poaDocType?: string;
    poaDocStatus?: ProofDocStatus;
    poaDocUrl?: string;
    sofDocStatus?: ProofDocStatus;
    sofDocUrl?: string;
    sofDescription?: string;
    pepStatus?: PepStatus;
    pepNotes?: string;
  }, reviewedById: number, user: ActingUser) {
    assertDepartment(user.role, user.department, Department.KYC);
    if (isKycDecision(data)) {
      assertMinRole(user.role, Role.SUPERVISOR);
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    return this.prisma.playerKYC.upsert({
      where: { playerId },
      update: { ...data, reviewedAt: new Date(), reviewedById },
      create: { ...data, playerId, reviewedAt: new Date(), reviewedById },
    });
  }
}
