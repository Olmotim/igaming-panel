import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
    };

    const configService = {
      get: jest.fn().mockReturnValue('fake-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('debería devolver los datos del usuario si existe en la base de datos', async () => {
      // Arrange
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        role: 'agent',
        department: 'support',
        password: 'hash-no-deberia-importar-aqui',
      });

      const payload = { sub: 1, email: 'olmo@test.com', role: 'agent' };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result).toEqual({
        id: 1,
        email: 'olmo@test.com',
        role: 'agent',
        department: 'support',
      });
      expect(result).not.toHaveProperty('password'); // nunca debe filtrarse, ni aquí
    });

    it('debería lanzar UnauthorizedException si el usuario del token ya no existe', async () => {
      // Arrange: el usuario fue borrado de la BD, pero el JWT sigue siendo "válido"
      prisma.user.findUnique.mockResolvedValue(null);

      const payload = { sub: 999, email: 'fantasma@test.com', role: 'agent' };

      // Act + Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});