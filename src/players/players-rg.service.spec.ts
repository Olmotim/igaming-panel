import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlayersRgService } from './players-rg.service';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma.service';

describe('PlayersRgService', () => {
  let service: PlayersRgService;
  let prisma: {
    player: { findUnique: jest.Mock };
    playerRGLimit: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let playersService: { applyStatusTransition: jest.Mock };

  beforeEach(async () => {
    prisma = {
      player: { findUnique: jest.fn() },
      playerRGLimit: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback: any) => callback(prisma));

    playersService = { applyStatusTransition: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersRgService,
        { provide: PrismaService, useValue: prisma },
        { provide: PlayersService, useValue: playersService },
      ],
    }).compile();

    service = module.get<PlayersRgService>(PlayersRgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('debería crear el límite SIN llamar a applyStatusTransition si el tipo no es SELF_EXCLUSION', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerRGLimit.create.mockResolvedValue({ id: 1, playerId: 10, type: 'DEPOSIT_LIMIT', amount: 500 });

      // Act
      await service.addRGLimit(10, { type: 'DEPOSIT_LIMIT', amount: 500 });

      // Assert: como el tipo NO es SELF_EXCLUSION, applyStatusTransition nunca debería llamarse
      expect(playersService.applyStatusTransition).not.toHaveBeenCalled();
    });

    it('debería crear el límite Y llamar a applyStatusTransition("self_excluded") si el tipo es SELF_EXCLUSION', async () => {
      // Arrange
      prisma.player.findUnique.mockResolvedValue({ id: 10 });
      prisma.playerRGLimit.create.mockResolvedValue({
        id: 2,
        playerId: 10,
        type: 'SELF_EXCLUSION',
        excludedUntil: new Date('2027-01-01'),
      });

      // Act
      await service.addRGLimit(10, { type: 'SELF_EXCLUSION', excludedUntil: new Date('2027-01-01') });

      // Assert: la creación del límite y la autoexclusión deben ir en la misma transacción
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // El 3er arg es el `tx` de la transacción (el mismo `prisma` mockeado)
      expect(playersService.applyStatusTransition).toHaveBeenCalledWith(10, 'SELF_EXCLUDED', prisma);
    });
  });

  describe('updateRGLimitStatus', () => {
    it('debería lanzar NotFoundException si el límite no existe', async () => {
      // Arrange
      prisma.playerRGLimit.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updateRGLimitStatus(999, 'CANCELLED')).rejects.toThrow(NotFoundException);
    });

    it('debería actualizar el status del límite cuando existe', async () => {
      // Arrange
      prisma.playerRGLimit.findUnique.mockResolvedValue({ id: 1, status: 'ACTIVE' });
      prisma.playerRGLimit.update.mockResolvedValue({ id: 1, status: 'CANCELLED' });

      // Act
      const result = await service.updateRGLimitStatus(1, 'CANCELLED');

      // Assert
      expect(result).toEqual({ id: 1, status: 'CANCELLED' });
      expect(prisma.playerRGLimit.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CANCELLED' },
      });
    });
  });

  describe('checkExpiredExclusions', () => {
    it('debería expirar el límite y reactivar al jugador para cada autoexclusión vencida', async () => {
      // Arrange
      prisma.playerRGLimit.findMany.mockResolvedValue([
        { id: 1, playerId: 10, excludedUntil: new Date('2020-01-01') },
        { id: 2, playerId: 20, excludedUntil: new Date('2020-01-01') },
      ]);

      // Act
      const result = await service.checkExpiredExclusions();

      // Assert: una transacción por límite
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(prisma.playerRGLimit.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'EXPIRED' },
      });
      expect(prisma.playerRGLimit.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: 'EXPIRED' },
      });
      expect(playersService.applyStatusTransition).toHaveBeenCalledWith(10, 'ACTIVE', prisma);
      expect(playersService.applyStatusTransition).toHaveBeenCalledWith(20, 'ACTIVE', prisma);
      expect(result).toEqual({ reactivated: 2 });
    });

    it('no debería hacer nada si no hay autoexclusiones vencidas', async () => {
      // Arrange
      prisma.playerRGLimit.findMany.mockResolvedValue([]);

      // Act
      const result = await service.checkExpiredExclusions();

      // Assert
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({ reactivated: 0 });
    });
  });
});
