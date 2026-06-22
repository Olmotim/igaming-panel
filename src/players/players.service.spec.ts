import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma.service';

describe('PlayersService', () => {
  let service: PlayersService;
  let prisma: {
    player: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    playerKYC: { findUnique: jest.Mock; upsert: jest.Mock };
    playerPayment: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    playerBonus: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    playerRGLimit: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      player: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      playerKYC: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      playerPayment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      playerBonus: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      playerRGLimit: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería crear un jugador nuevo cuando el email no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockResolvedValue({
        id: 1,
        email: 'jugador@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
      });

      // Act
      const result = await service.create('jugador@test.com', 'Juan', 'Pérez');

      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'jugador@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
      });
      expect(prisma.player.create).toHaveBeenCalledWith({
        data: { email: 'jugador@test.com', firstName: 'Juan', lastName: 'Pérez' },
      });
    });

    it('debería lanzar ConflictException si ya existe un jugador con ese email', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({
        id: 1,
        email: 'existente@test.com',
        firstName: 'Ana',
        lastName: 'García',
      });

      // Act + Assert
      await expect(
        service.create('existente@test.com', 'Ana', 'García'),
      ).rejects.toThrow(ConflictException);

      expect(prisma.player.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debería devolver el jugador con sus relaciones cuando existe', async () => {
      // Arrange
      const mockPlayer = {
        id: 1,
        email: 'jugador@test.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        notes: [],
        kyc: null,
        payments: [],
        bonuses: [],
        rgLimits: [],
        tickets: [],
        loginHistory: [],
      };
      prisma.player.findUnique.mockResolvedValue(mockPlayer);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toEqual(mockPlayer);
    });

    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertKYC', () => {
    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.upsertKYC(999, { kycLevel: 'BASIC' }, 1),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.playerKYC.upsert).not.toHaveBeenCalled();
    });

    it('debería llamar a upsert con los datos correctos cuando el jugador existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 1, email: 'jugador@test.com' });

      const kycData = { kycLevel: 'FULL', idDocStatus: 'APPROVED' };
      const expectedResult = { id: 10, playerId: 1, ...kycData };
      prisma.playerKYC.upsert.mockResolvedValue(expectedResult);

      // Act
      const result = await service.upsertKYC(1, kycData, 5);

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

  describe('updatePaymentStatus', () => {
    it('debería lanzar NotFoundException si el pago no existe', async () => {
      // Arrange
      prisma.playerPayment.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updatePaymentStatus(999, 'APPROVED')).rejects.toThrow(NotFoundException);
    });

    it('debería incrementar el balance cuando un DEPOSIT pasa a APPROVED', async () => {
      // Arrange: el pago estaba PENDING, ahora se aprueba
      prisma.playerPayment.findUnique.mockResolvedValue({
        id: 1,
        playerId: 10,
        type: 'DEPOSIT',
        amount: 100,
        status: 'PENDING',
        processedAt: null,
      });
      prisma.playerPayment.update.mockResolvedValue({ id: 1, status: 'APPROVED' });

      // Act
      await service.updatePaymentStatus(1, 'APPROVED');

      // Assert: el balance del jugador debe incrementarse en +100 (DEPOSIT aprobado)
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { realBalance: { increment: 100 } },
      });
    });

    it('debería decrementar el balance cuando un WITHDRAWAL pasa a APPROVED', async () => {
      // Arrange: un retiro aprobado debe RESTAR del balance real
      prisma.playerPayment.findUnique.mockResolvedValue({
        id: 2,
        playerId: 10,
        type: 'WITHDRAWAL',
        amount: 50,
        status: 'PENDING',
        processedAt: null,
      });
      prisma.playerPayment.update.mockResolvedValue({ id: 2, status: 'APPROVED' });

      // Act
      await service.updatePaymentStatus(2, 'APPROVED');

      // Assert
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { realBalance: { increment: -50 } },
      });
    });

    it('debería revertir el balance cuando un DEPOSIT aprobado se cambia a REJECTED', async () => {
      // Arrange: el pago YA estaba APPROVED, y ahora se revierte
      prisma.playerPayment.findUnique.mockResolvedValue({
        id: 3,
        playerId: 10,
        type: 'DEPOSIT',
        amount: 100,
        status: 'APPROVED',
        processedAt: new Date(),
      });
      prisma.playerPayment.update.mockResolvedValue({ id: 3, status: 'REJECTED' });

      // Act
      await service.updatePaymentStatus(3, 'REJECTED');

      // Assert: se debe deshacer el efecto original (-100, porque se había sumado antes)
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { realBalance: { increment: -100 } },
      });
    });

    it('NO debería tocar el balance si el pago pasa de PENDING a REJECTED (nunca estuvo aprobado)', async () => {
      // Arrange
      prisma.playerPayment.findUnique.mockResolvedValue({
        id: 4,
        playerId: 10,
        type: 'DEPOSIT',
        amount: 100,
        status: 'PENDING',
        processedAt: null,
      });
      prisma.playerPayment.update.mockResolvedValue({ id: 4, status: 'REJECTED' });

      // Act
      await service.updatePaymentStatus(4, 'REJECTED');

      // Assert: como nunca pasó por APPROVED, el balance no debe modificarse
      expect(prisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('addBonus', () => {
    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.addBonus(999, { type: 'WELCOME', amount: 50 }, 1),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.playerBonus.create).not.toHaveBeenCalled();
    });

    it('debería crear el bono e incrementar el bonusBalance del jugador', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10, email: 'jugador@test.com' });

      const bonusData = { type: 'WELCOME', amount: 50, wagering: 10 };
      const expectedBonus = { id: 1, playerId: 10, grantedById: 5, ...bonusData };
      prisma.playerBonus.create.mockResolvedValue(expectedBonus);

      // Act
      const result = await service.addBonus(10, bonusData, 5);

      // Assert
      expect(result).toEqual(expectedBonus);
      expect(prisma.playerBonus.create).toHaveBeenCalledWith({
        data: { ...bonusData, playerId: 10, grantedById: 5 },
        include: { grantedBy: { select: { id: true, email: true } } },
      });
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { bonusBalance: { increment: 50 } },
      });
    });
  });

  describe('updateBonusStatus', () => {
    it('debería lanzar NotFoundException si el bono no existe', async () => {
      // Arrange
      prisma.playerBonus.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updateBonusStatus(999, 'CANCELLED')).rejects.toThrow(NotFoundException);
    });

    it('debería decrementar bonusBalance cuando un bono ACTIVE pasa a CANCELLED', async () => {
      // Arrange
      prisma.playerBonus.findUnique.mockResolvedValue({
        id: 1,
        playerId: 10,
        amount: 50,
        status: 'ACTIVE',
        claimedAt: null,
      });
      prisma.playerBonus.update.mockResolvedValue({ id: 1, status: 'CANCELLED' });

      // Act
      await service.updateBonusStatus(1, 'CANCELLED');

      // Assert
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { bonusBalance: { decrement: 50 } },
      });
    });

    it('NO debería tocar el balance cuando un bono ACTIVE pasa a CLAIMED', async () => {
      // Arrange: CLAIMED no es un estado "inactivo" según la lógica (no es CANCELLED ni EXPIRED)
      prisma.playerBonus.findUnique.mockResolvedValue({
        id: 2,
        playerId: 10,
        amount: 30,
        status: 'ACTIVE',
        claimedAt: null,
      });
      prisma.playerBonus.update.mockResolvedValue({ id: 2, status: 'CLAIMED' });

      // Act
      await service.updateBonusStatus(2, 'CLAIMED');

      // Assert: el balance no debe modificarse
      expect(prisma.player.update).not.toHaveBeenCalled();
    });

    it('NO debería decrementar el balance dos veces si el bono ya estaba inactivo', async () => {
      // Arrange: el bono ya estaba EXPIRED (no ACTIVE), y ahora se intenta cancelar también
      prisma.playerBonus.findUnique.mockResolvedValue({
        id: 3,
        playerId: 10,
        amount: 20,
        status: 'EXPIRED',
        claimedAt: null,
      });
      prisma.playerBonus.update.mockResolvedValue({ id: 3, status: 'CANCELLED' });

      // Act
      await service.updateBonusStatus(3, 'CANCELLED');

      // Assert: como wasActive es false, no se debe tocar el balance otra vez
      expect(prisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('addRGLimit', () => {
    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.addRGLimit(999, { type: 'DEPOSIT_LIMIT', amount: 500 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.playerRGLimit.create).not.toHaveBeenCalled();
    });

    it('debería crear el límite SIN llamar a updateStatus si el tipo no es SELF_EXCLUSION', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerRGLimit.create.mockResolvedValue({ id: 1, playerId: 10, type: 'DEPOSIT_LIMIT', amount: 500 });

      // Spy sobre updateStatus: lo "vigilamos" sin reemplazar su comportamiento real
      const updateStatusSpy = jest.spyOn(service, 'updateStatus');

      // Act
      await service.addRGLimit(10, { type: 'DEPOSIT_LIMIT', amount: 500 });

      // Assert: como el tipo NO es SELF_EXCLUSION, updateStatus nunca debería llamarse
      expect(updateStatusSpy).not.toHaveBeenCalled();
    });

    it('debería crear el límite Y llamar a updateStatus("self_excluded") si el tipo es SELF_EXCLUSION', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerRGLimit.create.mockResolvedValue({
        id: 2,
        playerId: 10,
        type: 'SELF_EXCLUSION',
        excludedUntil: new Date('2027-01-01'),
      });

      // Reemplazamos updateStatus con un mock vacío (no nos importa su lógica interna aquí)
      const updateStatusSpy = jest.spyOn(service, 'updateStatus').mockResolvedValue(undefined as any);

      // Act
      await service.addRGLimit(10, { type: 'SELF_EXCLUSION', excludedUntil: new Date('2027-01-01') });

      // Assert: debe haberse llamado exactamente con estos argumentos
      expect(updateStatusSpy).toHaveBeenCalledWith(10, 'self_excluded');
    });
  });
});