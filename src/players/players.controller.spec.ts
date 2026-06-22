import { Test, TestingModule } from '@nestjs/testing';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

describe('PlayersController', () => {
  let controller: PlayersController;
  let playersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    upsertKYC: jest.Mock;
    getKYC: jest.Mock;
    addBonus: jest.Mock;
    addRGLimit: jest.Mock;
  };

  beforeEach(async () => {
    playersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      upsertKYC: jest.fn(),
      getKYC: jest.fn(),
      addBonus: jest.fn(),
      addRGLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [{ provide: PlayersService, useValue: playersService }],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('findOne', () => {
    it('debería llamar a playersService.findOne con el id parseado', async () => {
      // Arrange
      const mockPlayer = { id: 1, email: 'jugador@test.com' };
      playersService.findOne.mockResolvedValue(mockPlayer);

      // Act
      const result = await controller.findOne(1);

      // Assert
      expect(playersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPlayer);
    });
  });

  describe('getKYC', () => {
    it('debería llamar a playersService.getKYC con el id parseado', async () => {
      // Arrange
      const mockKyc = { id: 1, playerId: 1, kycLevel: 'FULL' };
      playersService.getKYC.mockResolvedValue(mockKyc);

      // Act
      const result = await controller.getKYC(1);

      // Assert
      expect(playersService.getKYC).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockKyc);
    });
  });

  describe('update', () => {
    it('debería convertir dateOfBirth de string a Date antes de llamar al service', async () => {
      // Arrange
      playersService.update.mockResolvedValue({ id: 1, firstName: 'Juan' });

      // Act: dateOfBirth llega como string, como vendría del body de un POST/PUT real
      await controller.update(1, { firstName: 'Juan', dateOfBirth: '1990-05-15' });

      // Assert
      expect(playersService.update).toHaveBeenCalledWith(1, {
        firstName: 'Juan',
        dateOfBirth: expect.any(Date),
      });
    });

    it('debería pasar dateOfBirth como undefined si no viene en el body', async () => {
      // Arrange
      playersService.update.mockResolvedValue({ id: 1, firstName: 'Ana' });

      // Act: sin dateOfBirth en el body
      await controller.update(1, { firstName: 'Ana' });

      // Assert
      expect(playersService.update).toHaveBeenCalledWith(1, {
        firstName: 'Ana',
        dateOfBirth: undefined,
      });
    });
  });

  describe('upsertKYC', () => {
    it('debería convertir idDocExpiry de string a Date y pasar el id del usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 5 } };
      playersService.upsertKYC.mockResolvedValue({ id: 1, kycLevel: 'FULL' });

      // Act
      await controller.upsertKYC(1, { kycLevel: 'FULL', idDocExpiry: '2030-12-31' }, mockRequest);

      // Assert
      expect(playersService.upsertKYC).toHaveBeenCalledWith(
        1,
        { kycLevel: 'FULL', idDocExpiry: expect.any(Date) },
        5,
      );
    });
  });

  describe('addBonus', () => {
    it('debería convertir expiresAt de string a Date y pasar el id del usuario que otorga el bono', async () => {
      // Arrange
      const mockRequest = { user: { id: 3 } };
      playersService.addBonus.mockResolvedValue({ id: 1, type: 'WELCOME', amount: 50 });

      // Act
      await controller.addBonus(
        1,
        { type: 'WELCOME', amount: 50, expiresAt: '2026-12-31' },
        mockRequest,
      );

      // Assert
      expect(playersService.addBonus).toHaveBeenCalledWith(
        1,
        { type: 'WELCOME', amount: 50, expiresAt: expect.any(Date) },
        3,
      );
    });
  });

  describe('addRGLimit', () => {
    it('debería convertir las tres fechas opcionales (endDate, coolingOffUntil, excludedUntil) de string a Date', async () => {
      // Arrange
      playersService.addRGLimit.mockResolvedValue({ id: 1, type: 'SELF_EXCLUSION' });

      // Act
      await controller.addRGLimit(1, {
        type: 'SELF_EXCLUSION',
        excludedUntil: '2027-01-01',
        endDate: '2027-06-01',
        coolingOffUntil: '2026-08-01',
      });

      // Assert
      expect(playersService.addRGLimit).toHaveBeenCalledWith(1, {
        type: 'SELF_EXCLUSION',
        excludedUntil: expect.any(Date),
        endDate: expect.any(Date),
        coolingOffUntil: expect.any(Date),
      });
    });

    it('debería pasar undefined en las fechas opcionales cuando no vienen en el body', async () => {
      // Arrange
      playersService.addRGLimit.mockResolvedValue({ id: 2, type: 'DEPOSIT_LIMIT' });

      // Act
      await controller.addRGLimit(1, { type: 'DEPOSIT_LIMIT', amount: 500 });

      // Assert
      expect(playersService.addRGLimit).toHaveBeenCalledWith(1, {
        type: 'DEPOSIT_LIMIT',
        amount: 500,
        endDate: undefined,
        coolingOffUntil: undefined,
        excludedUntil: undefined,
      });
    });
  });
});