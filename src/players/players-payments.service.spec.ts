import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Department, Role } from '@prisma/client';
import { PlayersPaymentsService } from './players-payments.service';
import { PrismaService } from '../prisma.service';
import { ActingUser } from '../auth/authorization.helper';

const paymentsSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.PAYMENTS };
const paymentsAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.PAYMENTS };
const supportAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.SUPPORT };
const riskSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.RISK };

describe('PlayersPaymentsService', () => {
  let service: PlayersPaymentsService;
  let prisma: {
    player: { findUnique: jest.Mock; update: jest.Mock };
    playerPayment: { findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      player: { findUnique: jest.fn(), update: jest.fn() },
      playerPayment: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayersPaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlayersPaymentsService>(PlayersPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePaymentStatus', () => {
    it('debería lanzar NotFoundException si el pago no existe', async () => {
      // Arrange
      prisma.playerPayment.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updatePaymentStatus(999, 'APPROVED', paymentsSupervisor)).rejects.toThrow(NotFoundException);
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
      await service.updatePaymentStatus(1, 'APPROVED', paymentsSupervisor);

      // Assert: ambas escrituras (status del pago + balance) deben ir dentro de la misma transacción
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
      await service.updatePaymentStatus(2, 'APPROVED', paymentsSupervisor);

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
      await service.updatePaymentStatus(3, 'REJECTED', paymentsSupervisor);

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
      await service.updatePaymentStatus(4, 'REJECTED', paymentsSupervisor);

      // Assert: como nunca pasó por APPROVED, el balance no debe modificarse
      expect(prisma.player.update).not.toHaveBeenCalled();
    });
  });

  describe('addPayment (autorización)', () => {
    it('debería rechazar a un agente fuera de PAYMENTS', async () => {
      await expect(
        service.addPayment(10, { type: 'DEPOSIT', amount: 100 }, supportAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un AGENT de PAYMENTS', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerPayment.create.mockResolvedValue({ id: 1, playerId: 10, type: 'DEPOSIT', amount: 100 });

      await expect(
        service.addPayment(10, { type: 'DEPOSIT', amount: 100 }, paymentsAgent),
      ).resolves.toBeDefined();
    });
  });

  describe('updatePaymentStatus (autorización)', () => {
    it('debería rechazar a un AGENT de PAYMENTS (rol insuficiente)', async () => {
      await expect(
        service.updatePaymentStatus(1, 'APPROVED', paymentsAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar a un SUPERVISOR fuera de PAYMENTS', async () => {
      await expect(
        service.updatePaymentStatus(1, 'APPROVED', riskSupervisor),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
