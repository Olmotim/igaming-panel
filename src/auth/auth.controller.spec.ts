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
    it('debería llamar a authService.register con el email y password del dto, y devolver su resultado', async () => {
      // Arrange
      const expectedResult = { id: 1, email: 'olmo@test.com', role: 'user' };
      authService.register.mockResolvedValue(expectedResult);

      const dto = { email: 'olmo@test.com', password: 'password123' };

      // Act
      const result = await controller.register(dto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith('olmo@test.com', 'password123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('debería setear el refresh_token como cookie httpOnly y devolver solo el access_token en el body', async () => {
      // Arrange
      authService.login.mockResolvedValue({ access_token: 'fake-access', refresh_token: 'fake-refresh' });
      const mockRes = { cookie: jest.fn() };
      const dto = { email: 'olmo@test.com', password: 'password123' };

      // Act
      const result = await controller.login(dto, mockRes as any);

      // Assert
      expect(authService.login).toHaveBeenCalledWith('olmo@test.com', 'password123');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'fake-refresh',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
      expect(result).toEqual({ access_token: 'fake-access' });
    });
  });

  describe('refresh', () => {
    it('debería leer el refresh_token de la cookie, renovar la cookie y devolver solo el access_token', async () => {
      // Arrange
      authService.refresh.mockResolvedValue({ access_token: 'nuevo-access', refresh_token: 'nuevo-refresh' });
      const mockReq = { cookies: { refresh_token: 'token-del-cliente' } };
      const mockRes = { cookie: jest.fn() };

      // Act
      const result = await controller.refresh(mockReq as any, mockRes as any);

      // Assert
      expect(authService.refresh).toHaveBeenCalledWith('token-del-cliente');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'nuevo-refresh',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
      expect(result).toEqual({ access_token: 'nuevo-access' });
    });
  });

  describe('logout', () => {
    it('debería limpiar la cookie de refresh_token y llamar a authService.logout con el id del usuario autenticado', async () => {
      // Arrange: simulamos el objeto `req` tal como lo dejaría JwtAuthGuard tras validar el token
      const mockRequest = { user: { id: 1, email: 'olmo@test.com', role: 'agent' } };
      const mockRes = { clearCookie: jest.fn() };
      const expectedResult = { message: 'Sesión cerrada correctamente' };
      authService.logout.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.logout(mockRequest, mockRes as any);

      // Assert
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/auth' });
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
