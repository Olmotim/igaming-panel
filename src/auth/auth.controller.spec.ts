import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('debería llamar a authService.register con el email y password del body, y devolver su resultado', async () => {
      // Arrange
      const expectedResult = { id: 1, email: 'olmo@test.com', role: 'user' };
      authService.register.mockResolvedValue(expectedResult);

      const body = { email: 'olmo@test.com', password: 'password123' };

      // Act
      const result = await controller.register(body);

      // Assert
      expect(authService.register).toHaveBeenCalledWith('olmo@test.com', 'password123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('debería llamar a authService.login con el email y password del body, y devolver su resultado', async () => {
      // Arrange
      const expectedResult = { access_token: 'fake-access', refresh_token: 'fake-refresh' };
      authService.login.mockResolvedValue(expectedResult);

      const body = { email: 'olmo@test.com', password: 'password123' };

      // Act
      const result = await controller.login(body);

      // Assert
      expect(authService.login).toHaveBeenCalledWith('olmo@test.com', 'password123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('refresh', () => {
    it('debería llamar a authService.refresh con el refresh_token del body, y devolver su resultado', async () => {
      // Arrange
      const expectedResult = { access_token: 'nuevo-access', refresh_token: 'nuevo-refresh' };
      authService.refresh.mockResolvedValue(expectedResult);

      const body = { refresh_token: 'token-del-cliente' };

      // Act
      const result = await controller.refresh(body);

      // Assert
      expect(authService.refresh).toHaveBeenCalledWith('token-del-cliente');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('debería llamar a authService.logout con el id del usuario autenticado', async () => {
      // Arrange: simulamos el objeto `req` tal como lo dejaría JwtAuthGuard tras validar el token
      const mockRequest = { user: { id: 1, email: 'olmo@test.com', role: 'agent' } };
      const expectedResult = { message: 'Sesión cerrada correctamente' };
      authService.logout.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.logout(mockRequest);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getProfile', () => {
    it('debería devolver el usuario autenticado desde req.user', () => {
      // Arrange
      const mockRequest = { user: { id: 1, email: 'olmo@test.com', role: 'agent' } };

      // Act
      const result = controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual({ id: 1, email: 'olmo@test.com', role: 'agent' });
    });
  });

  describe('getAdmin', () => {
    it('debería devolver el mensaje de bienvenida junto con el usuario autenticado', () => {
      // Arrange
      const mockRequest = { user: { id: 2, email: 'admin@test.com', role: 'admin' } };

      // Act
      const result = controller.getAdmin(mockRequest);

      // Assert
      expect(result).toEqual({
        message: 'Bienvenido al panel de administración',
        user: { id: 2, email: 'admin@test.com', role: 'admin' },
      });
    });
  });
});