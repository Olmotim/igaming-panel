import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock } };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    // Arrange (a nivel de setup): mocks de cada dependencia
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('fake-jwt-token'),
       verifyAsync: jest.fn(), // lo dejamos vacío aquí; cada test define su comportamiento específico
    };

    const configService = {
      get: jest.fn().mockReturnValue('fake-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //TEST DE LOGIN
  describe('login', () => {
    it('debería devolver access_token y refresh_token cuando las credenciales son correctas', async () => {
      // Arrange: generamos un hash REAL para 'password123'
      const plainPassword = 'password123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        password: hashedPassword,
        role: 'agent',
      });

      prisma.user.update.mockResolvedValue({});

      // Act
      const result = await service.login('olmo@test.com', plainPassword);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.access_token).toBe('fake-jwt-token');
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      // Arrange: Prisma NO encuentra ningún usuario con ese email
      prisma.user.findUnique.mockResolvedValue(null);

      // Act + Assert (en este caso van juntos porque esperamos una excepción)
      await expect(
        service.login('noexiste@test.com', 'cualquierpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      // Arrange: el usuario existe con hash real de 'password123'
      const hashedPassword = await bcrypt.hash('password123', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        password: hashedPassword,
        role: 'agent',
      });

      // Act + Assert: mandamos una contraseña diferente
      await expect(
        service.login('olmo@test.com', 'password-incorrecta'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
  //TEST DE REGISTER
  describe('register', () => {
    it('debería crear un usuario nuevo cuando el email no existe', async () => {
      // Arrange: Prisma no encuentra ningún usuario con ese email
      prisma.user.findUnique.mockResolvedValue(null);

      // Prisma "crea" el usuario y devuelve el registro resultante
      prisma.user.create.mockResolvedValue({
        id: 5,
        email: 'nuevo@test.com',
        password: 'hash-no-importa-aqui',
        role: 'user',
      });

      // Act
      const result = await service.register('nuevo@test.com', 'miPassword123');

      // Assert
      expect(result).toEqual({ id: 5, email: 'nuevo@test.com', role: 'user' });
      expect(result).not.toHaveProperty('password'); // nunca debe filtrar la contraseña
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('debería lanzar ConflictException si el email ya está registrado', async () => {
      // Arrange: Prisma SÍ encuentra un usuario existente con ese email
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'existente@test.com',
        password: 'algun-hash',
        role: 'user',
      });

      // Act + Assert
      await expect(
        service.register('existente@test.com', 'cualquierPassword'),
      ).rejects.toThrow(ConflictException);

      // Verificamos que, al detectar el duplicado, NUNCA se intentó crear el usuario
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });
  //TEST DE REFRESH
  describe('refresh', () => {
    it('debería devolver nuevos tokens cuando el refresh token es válido', async () => {
      // Arrange
      const oldRefreshToken = 'token-original-del-cliente';
      const hashedRefreshToken = await bcrypt.hash(oldRefreshToken, 10);

      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'olmo@test.com',
        role: 'agent',
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        role: 'agent',
        refreshToken: hashedRefreshToken,
      });

      prisma.user.update.mockResolvedValue({});

      // Act
      const result = await service.refresh(oldRefreshToken);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('debería lanzar UnauthorizedException si el JWT es inválido o expiró', async () => {
      // Arrange: verifyAsync rechaza (simula token expirado/inválido)
      jwtService.verifyAsync = jest.fn().mockRejectedValue(new Error('jwt expired'));

      // Act + Assert
      await expect(service.refresh('token-invalido')).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      // Arrange
      jwtService.verifyAsync = jest.fn().mockResolvedValue({ sub: 999, email: 'x@test.com', role: 'user' });
      prisma.user.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.refresh('cualquier-token')).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario no tiene refreshToken guardado', async () => {
      // Arrange: el usuario existe pero refreshToken es null (ej: ya hizo logout antes)
      jwtService.verifyAsync = jest.fn().mockResolvedValue({ sub: 1, email: 'olmo@test.com', role: 'agent' });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        role: 'agent',
        refreshToken: null,
      });

      // Act + Assert
      await expect(service.refresh('cualquier-token')).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el refresh token no coincide con el hash guardado', async () => {
      // Arrange: el usuario tiene un refreshToken hasheado distinto al que llega
      const hashedDeOtroToken = await bcrypt.hash('otro-token-distinto', 10);

      jwtService.verifyAsync = jest.fn().mockResolvedValue({ sub: 1, email: 'olmo@test.com', role: 'agent' });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'olmo@test.com',
        role: 'agent',
        refreshToken: hashedDeOtroToken,
      });

      // Act + Assert: mandamos un token que no coincide con el hash guardado
      await expect(service.refresh('token-robado-o-reusado')).rejects.toThrow(UnauthorizedException);
    });
  });
  //TEST DE LOGOUT
  describe('logout', () => {
    it('debería limpiar el refreshToken del usuario y devolver mensaje de confirmación', async () => {
      // Arrange
      prisma.user.update.mockResolvedValue({});

      // Act
      const result = await service.logout(1);

      // Assert
      expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: null },
      });
    });
  });
});
