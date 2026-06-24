import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Department, IdDocStatus, KycLevel, Role } from '@prisma/client';
import { PlayersKycService } from './players-kyc.service';
import { PrismaService } from '../prisma.service';
import { ActingUser } from '../auth/authorization.helper';

const kycSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.KYC };
const kycAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.KYC };
const supportAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.SUPPORT };

describe('PlayersKycService', () => {
  let service: PlayersKycService;
  let prisma: {
    player: { findUnique: jest.Mock };
    playerKYC: { findUnique: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      player: { findUnique: jest.fn() },
      playerKYC: { findUnique: jest.fn(), upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersKycService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlayersKycService>(PlayersKycService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertKYC', () => {
    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.upsertKYC(999, { kycLevel: 'TIER_1' }, 1, kycAgent),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.playerKYC.upsert).not.toHaveBeenCalled();
    });

    it('debería llamar a upsert con los datos correctos cuando el jugador existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 1, email: 'jugador@test.com' });

      const kycData = { kycLevel: KycLevel.TIER_2, idDocStatus: IdDocStatus.APPROVED };
      const expectedResult = { id: 10, playerId: 1, ...kycData };
      prisma.playerKYC.upsert.mockResolvedValue(expectedResult);

      // Act: idDocStatus APPROVED es una decisión, requiere SUPERVISOR+ en KYC
      const result = await service.upsertKYC(1, kycData, 5, kycSupervisor);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(prisma.playerKYC.upsert).toHaveBeenCalledWith({
        where: { playerId: 1 },
        update: {
          ...kycData,
          reviewedAt: expect.any(Date),
          reviewedById: 5,
        },
        create: {
          ...kycData,
          playerId: 1,
          reviewedAt: expect.any(Date),
          reviewedById: 5,
        },
      });
    });
  });

  describe('upsertKYC (autorización)', () => {
    it('debería rechazar a un agente fuera de KYC', async () => {
      await expect(
        service.upsertKYC(10, { kycLevel: 'TIER_1' }, 1, supportAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un AGENT de KYC subir un documento (status no es una decisión)', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerKYC.upsert.mockResolvedValue({ id: 1, playerId: 10, idDocStatus: 'PENDING' });

      await expect(
        service.upsertKYC(10, { idDocStatus: 'PENDING' }, 1, kycAgent),
      ).resolves.toBeDefined();
    });

    it('debería rechazar a un AGENT de KYC que intenta APROBAR un documento (es una decisión)', async () => {
      await expect(
        service.upsertKYC(10, { idDocStatus: 'APPROVED' }, 1, kycAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un SUPERVISOR de KYC aprobar un documento', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerKYC.upsert.mockResolvedValue({ id: 1, playerId: 10, idDocStatus: 'APPROVED' });

      await expect(
        service.upsertKYC(10, { idDocStatus: 'APPROVED' }, 1, kycSupervisor),
      ).resolves.toBeDefined();
    });

    it('debería rechazar a un AGENT de KYC que marca a alguien como PEP (es una decisión)', async () => {
      await expect(
        service.upsertKYC(10, { pepStatus: 'PEP' }, 1, kycAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    // poaDocStatus/sofDocStatus usan VERIFIED (no APPROVED) como valor de aprobación — antes de tipar
    // estos campos con su propio enum, isKycDecision comparaba los tres contra ['APPROVED','REJECTED'],
    // así que un AGENT podía marcar poa/sof como VERIFIED sin pasar por el gate de SUPERVISOR.
    it('debería rechazar a un AGENT de KYC que marca poaDocStatus como VERIFIED (es una decisión)', async () => {
      await expect(
        service.upsertKYC(10, { poaDocStatus: 'VERIFIED' }, 1, kycAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar a un AGENT de KYC que marca sofDocStatus como VERIFIED (es una decisión)', async () => {
      await expect(
        service.upsertKYC(10, { sofDocStatus: 'VERIFIED' }, 1, kycAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un SUPERVISOR de KYC marcar poaDocStatus como VERIFIED', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerKYC.upsert.mockResolvedValue({ id: 1, playerId: 10, poaDocStatus: 'VERIFIED' });

      await expect(
        service.upsertKYC(10, { poaDocStatus: 'VERIFIED' }, 1, kycSupervisor),
      ).resolves.toBeDefined();
    });
  });
});
