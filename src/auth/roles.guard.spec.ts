import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
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
  function createMockContext(user: { role: Role }): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('debería permitir el acceso si el endpoint no requiere un rol mínimo', () => {
    // Arrange: el endpoint NO tiene @Roles(...), así que el reflector devuelve undefined
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ role: Role.AGENT });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('debería permitir el acceso si el rol del usuario coincide exactamente con el mínimo requerido', () => {
    // Arrange: el endpoint requiere ADMIN como mínimo, y el usuario ES admin
    reflector.getAllAndOverride.mockReturnValue(Role.ADMIN);
    const context = createMockContext({ role: Role.ADMIN });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('debería permitir el acceso si el rol del usuario está por encima del mínimo requerido', () => {
    // Arrange: el endpoint requiere SUPERVISOR como mínimo, y el usuario es ADMIN (jerarquía superior)
    reflector.getAllAndOverride.mockReturnValue(Role.SUPERVISOR);
    const context = createMockContext({ role: Role.ADMIN });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('debería denegar el acceso si el rol del usuario está por debajo del mínimo requerido', () => {
    // Arrange: el endpoint requiere ADMIN como mínimo, pero el usuario es AGENT
    reflector.getAllAndOverride.mockReturnValue(Role.ADMIN);
    const context = createMockContext({ role: Role.AGENT });

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(false);
  });
});
