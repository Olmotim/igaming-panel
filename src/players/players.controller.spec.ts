import { Test, TestingModule } from '@nestjs/testing';
import { BonusType, KycLevel, RGLimitType } from '@prisma/client';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { PlayersKycService } from './players-kyc.service';
import { PlayersPaymentsService } from './players-payments.service';
import { PlayersBonusesService } from './players-bonuses.service';
import { PlayersRgService } from './players-rg.service';

describe('PlayersController', () => {
  let controller: PlayersController;
  let playersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let kycService: { getKYC: jest.Mock; upsertKYC: jest.Mock };
  let paymentsService: { addPayment: jest.Mock };
  let bonusesService: { addBonus: jest.Mock };
  let rgService: { addRGLimit: jest.Mock };

  beforeEach(async () => {
    playersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    kycService = { getKYC: jest.fn(), upsertKYC: jest.fn() };
    paymentsService = { addPayment: jest.fn() };
    bonusesService = { addBonus: jest.fn() };
    rgService = { addRGLimit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        { provide: PlayersService, useValue: playersService },
        { provide: PlayersKycService, useValue: kycService },
        { provide: PlayersPaymentsService, useValue: paymentsService },
        { provide: PlayersBonusesService, useValue: bonusesService },
        { provide: PlayersRgService, useValue: rgService },
      ],
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
    it('debería llamar a kycService.getKYC con el id parseado', async () => {
      // Arrange
      const mockKyc = { id: 1, playerId: 1, kycLevel: 'TIER_2' };
      kycService.getKYC.mockResolvedValue(mockKyc);

      // Act
      const result = await controller.getKYC(1);

      // Assert
      expect(kycService.getKYC).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockKyc);
    });
  });

  describe('update', () => {
    // Nota: la conversión de fechas (string -> Date) ahora la hace el ValidationPipe global
    // a través de @Type(() => Date) en el DTO, no el controller. Por eso aquí el dto ya llega
    // con dateOfBirth como Date, igual que lo recibiría el controller en un request real.
    it('debería pasar el dto recibido directamente al service', async () => {
      // Arrange
      playersService.update.mockResolvedValue({ id: 1, firstName: 'Juan' });
      const dto = { firstName: 'Juan', dateOfBirth: new Date('1990-05-15') };

      // Act
      await controller.update(1, dto);

      // Assert
      expect(playersService.update).toHaveBeenCalledWith(1, dto);
    });

    it('debería pasar dateOfBirth como undefined si no viene en el dto', async () => {
      // Arrange
      playersService.update.mockResolvedValue({ id: 1, firstName: 'Ana' });
      const dto = { firstName: 'Ana' };

      // Act
      await controller.update(1, dto);

      // Assert
      expect(playersService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('upsertKYC', () => {
    it('debería pasar el dto (con idDocExpiry ya como Date) y el id del usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 5 } };
      kycService.upsertKYC.mockResolvedValue({ id: 1, kycLevel: 'TIER_2' });
      const dto = { kycLevel: KycLevel.TIER_2, idDocExpiry: new Date('2030-12-31') };

      // Act
      await controller.upsertKYC(1, dto, mockRequest);

      // Assert
      expect(kycService.upsertKYC).toHaveBeenCalledWith(1, dto, 5, mockRequest.user);
    });
  });

  describe('addBonus', () => {
    it('debería pasar el dto (con expiresAt ya como Date) y el id del usuario que otorga el bono', async () => {
      // Arrange
      const mockRequest = { user: { id: 3 } };
      bonusesService.addBonus.mockResolvedValue({ id: 1, type: 'DEPOSIT', amount: 50 });
      const dto = { type: BonusType.DEPOSIT, amount: 50, expiresAt: new Date('2026-12-31') };

      // Act
      await controller.addBonus(1, dto, mockRequest);

      // Assert
      expect(bonusesService.addBonus).toHaveBeenCalledWith(1, dto, 3, mockRequest.user);
    });
  });

  describe('addRGLimit', () => {
    it('debería pasar el dto con las tres fechas opcionales ya convertidas a Date', async () => {
      // Arrange
      rgService.addRGLimit.mockResolvedValue({ id: 1, type: 'SELF_EXCLUSION' });
      const dto = {
        type: RGLimitType.SELF_EXCLUSION,
        excludedUntil: new Date('2027-01-01'),
        endDate: new Date('2027-06-01'),
        coolingOffUntil: new Date('2026-08-01'),
      };

      // Act
      await controller.addRGLimit(1, dto);

      // Assert
      expect(rgService.addRGLimit).toHaveBeenCalledWith(1, dto);
    });

    it('debería pasar undefined en las fechas opcionales cuando no vienen en el dto', async () => {
      // Arrange
      rgService.addRGLimit.mockResolvedValue({ id: 2, type: 'DEPOSIT_LIMIT' });
      const dto = { type: RGLimitType.DEPOSIT_LIMIT, amount: 500 };

      // Act
      await controller.addRGLimit(1, dto);

      // Assert
      expect(rgService.addRGLimit).toHaveBeenCalledWith(1, dto);
    });
  });
});
