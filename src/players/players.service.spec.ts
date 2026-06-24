import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Department, PlayerStatus, Role } from '@prisma/client';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma.service';
import { ActingUser } from '../auth/authorization.helper';

const paymentsSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.PAYMENTS };
const supportSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.SUPPORT };
const riskSupervisor: ActingUser = { id: 5, role: Role.SUPERVISOR, department: Department.RISK };
const admin: ActingUser = { id: 1, role: Role.ADMIN, department: null };

describe('PlayersService', () => {
  let service: PlayersService;
  let prisma: {
    player: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      player: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));

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

  describe('updateStatus (autorización)', () => {
    it('debería rechazar a un agente de un departamento distinto a RISK/SUPPORT', async () => {
      await expect(service.updateStatus(10, PlayerStatus.SUSPENDED, paymentsSupervisor)).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar a un AGENT de RISK (rol insuficiente)', async () => {
      const riskAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.RISK };
      await expect(service.updateStatus(10, PlayerStatus.SUSPENDED, riskAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un SUPERVISOR de RISK', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.player.update.mockResolvedValue({ id: 10, status: PlayerStatus.SUSPENDED });

      await expect(service.updateStatus(10, PlayerStatus.SUSPENDED, riskSupervisor)).resolves.toBeDefined();
    });

    it('debería permitir a un ADMIN sin departamento (acceso cross-departamento)', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.player.update.mockResolvedValue({ id: 10, status: PlayerStatus.ACTIVE });

      await expect(service.updateStatus(10, PlayerStatus.ACTIVE, admin)).resolves.toBeDefined();
    });
  });

  describe('updateRisk (autorización)', () => {
    it('debería rechazar a un agente fuera de RISK', async () => {
      await expect(service.updateRisk(10, { riskLevel: 'HIGH' }, supportSupervisor)).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar a un AGENT de RISK (rol insuficiente)', async () => {
      const riskAgent: ActingUser = { id: 5, role: Role.AGENT, department: Department.RISK };
      await expect(service.updateRisk(10, { riskLevel: 'HIGH' }, riskAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un SUPERVISOR de RISK', async () => {
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.player.update.mockResolvedValue({ id: 10, riskLevel: 'HIGH' });

      await expect(service.updateRisk(10, { riskLevel: 'HIGH' }, riskSupervisor)).resolves.toBeDefined();
    });
  });
});
