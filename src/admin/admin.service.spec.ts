import { Test, TestingModule } from '@nestjs/testing';
import { Department } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { findMany: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
  it('debería devolver la lista de usuarios con los campos seleccionados', async () => {
    // Arrange
    const mockUsers = [
      { id: 1, email: 'agente@test.com', role: 'agent', department: 'SUPPORT', createdAt: new Date() },
    ];
    prisma.user.findMany.mockResolvedValue(mockUsers);

    // Act
    const result = await service.getUsers();

    // Assert
    expect(result).toEqual(mockUsers);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, email: true, role: true, department: true, createdAt: true },
    });
  });
});

describe('updateUserDepartment', () => {
  it('debería actualizar el departamento del usuario', async () => {
    // Arrange
    const expectedUser = { id: 1, email: 'agente@test.com', role: 'agent', department: Department.PAYMENTS };
    prisma.user.update.mockResolvedValue(expectedUser);

    // Act
    const result = await service.updateUserDepartment(1, Department.PAYMENTS);

    // Assert
    expect(result).toEqual(expectedUser);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { department: Department.PAYMENTS },
      select: { id: true, email: true, role: true, department: true },
    });
  });
});
});