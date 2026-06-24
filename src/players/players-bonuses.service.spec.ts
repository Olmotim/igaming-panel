import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BonusType, Department, Role } from '@prisma/client';
import { PlayersBonusesService } from './players-bonuses.service';
import { PrismaService } from '../prisma.service';
import { ActingUser } from '../auth/authorization.helper';

const supportAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.SUPPORT };
const supportSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.SUPPORT };
const paymentsAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.PAYMENTS };
const riskSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.RISK };

describe('PlayersBonusesService', () => {
  let service: PlayersBonusesService;
  let prisma: {
    player: { findUnique: jest.Mock; update: jest.Mock };
    playerBonus: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      player: { findUnique: jest.fn(), update: jest.fn() },
      playerBonus: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersBonusesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlayersBonusesService>(PlayersBonusesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addBonus', () => {
    it('debería lanzar NotFoundException si el jugador no existe', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.addBonus(999, { type: 'DEPOSIT', amount: 50 }, 1, supportAgent),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.playerBonus.create).not.toHaveBeenCalled();
    });

    it('debería crear el bono e incrementar el bonusBalance del jugador', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10, email: 'jugador@test.com' });

      const bonusData = { type: BonusType.DEPOSIT, amount: 50, wagering: 10 };
      const expectedBonus = { id: 1, playerId: 10, grantedById: 5, ...bonusData };
      prisma.playerBonus.create.mockResolvedValue(expectedBonus);

      // Act
      const result = await service.addBonus(10, bonusData, 5, supportAgent);

      // Assert: la creación del bono y el incremento de bonusBalance deben ir en la misma transacción
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
      await expect(service.updateBonusStatus(999, 'CANCELLED', supportSupervisor)).rejects.toThrow(NotFoundException);
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
      await service.updateBonusStatus(1, 'CANCELLED', supportSupervisor);

      // Assert: status del bono + balance deben ir en la misma transacción
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
      await service.updateBonusStatus(2, 'CLAIMED', supportSupervisor);

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
      await service.updateBonusStatus(3, 'CANCELLED', supportSupervisor);

      // Assert: como wasActive es false, no se debe tocar el balance otra vez
      expect(prisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('addBonus (autorización)', () => {
    it('debería rechazar a un agente fuera de PAYMENTS/SUPPORT', async () => {
      await expect(
        service.addBonus(10, { type: 'DEPOSIT', amount: 50 }, 1, riskSupervisor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un AGENT de PAYMENTS', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerBonus.create.mockResolvedValue({ id: 1, playerId: 10, grantedById: 1, type: 'DEPOSIT', amount: 50 });

      await expect(
        service.addBonus(10, { type: 'DEPOSIT', amount: 50 }, 1, paymentsAgent),
      ).resolves.toBeDefined();
    });
  });

  describe('updateBonusStatus (autorización)', () => {
    it('debería rechazar a un AGENT de SUPPORT (rol insuficiente)', async () => {
      await expect(
        service.updateBonusStatus(1, 'CANCELLED', supportAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar a un SUPERVISOR fuera de PAYMENTS/SUPPORT', async () => {
      await expect(
        service.updateBonusStatus(1, 'CANCELLED', riskSupervisor),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
