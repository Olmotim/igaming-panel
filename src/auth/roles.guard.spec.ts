import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: reflector }],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // Helper para construir un ExecutionContext falso con el user que queramos
  function createMockContext(user: { role: string }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('debería permitir el acceso si el endpoint no requiere roles específicos', () => {
    // Arrange: el endpoint NO tiene @Roles(...), así que el reflector devuelve undefined
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ role: 'agent' });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('debería permitir el acceso si el rol del usuario está en los roles requeridos', () => {
    // Arrange: el endpoint requiere 'admin', y el usuario ES admin
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ role: 'admin' });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('debería denegar el acceso si el rol del usuario NO está en los roles requeridos', () => {
    // Arrange: el endpoint requiere 'admin', pero el usuario es 'agent'
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ role: 'agent' });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
  });
});