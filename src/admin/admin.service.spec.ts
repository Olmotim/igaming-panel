import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { findMany: jest.Mock; update: jest.Mock };
    ticket: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
    player: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn(), update: jest.fn() },
      ticket: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
      player: { count: jest.fn() },
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
  it('debería actualizar el departamento del usuario convertido a mayúsculas', async () => {
    // Arrange
    const expectedUser = { id: 1, email: 'agente@test.com', role: 'agent', department: 'PAYMENTS' };
    prisma.user.update.mockResolvedValue(expectedUser);

    // Act: mandamos el department en minúsculas a propósito
    const result = await service.updateUserDepartment(1, 'payments');

    // Assert
    expect(result).toEqual(expectedUser);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { department: 'PAYMENTS' },
      select: { id: true, email: true, role: true, department: true },
    });
  });
});
describe('getDashboardMetrics', () => {
  it('debería combinar los KPIs y listas en la forma esperada', async () => {
    // Arrange: prisma.ticket.count() se llama 3 veces con distintos `where` —
    // inspeccionamos el `where` para decidir qué devolver en cada caso
    prisma.ticket.count.mockImplementation((args: any) => {
      if (args.where.status === 'OPEN') {
        return Promise.resolve(12); // ticketsOpen
      }
      if (args.where.priority === 'URGENT') {
        return Promise.resolve(3); // ticketsUrgent
      }
      if (args.where.status === 'RESOLVED') {
        return Promise.resolve(8); // ticketsResolvedToday
      }
      return Promise.resolve(0);
    });

    prisma.player.count.mockResolvedValue(5); // playersPendingKYC

    prisma.ticket.findMany
      .mockResolvedValueOnce([{ id: 1, title: 'Mi ticket asignado' }]) // myTickets (1ra llamada)
      .mockResolvedValueOnce([{ id: 2, title: 'Ticket reciente' }]);   // recentTickets (2da llamada)

    prisma.ticket.groupBy.mockResolvedValue([
      { department: 'SUPPORT', _count: { id: 4 } },
      { department: 'PAYMENTS', _count: { id: 2 } },
    ]);

    // Act
    const result = await service.getDashboardMetrics(7);

    // Assert
    expect(result.kpis).toEqual({
      ticketsOpen: 12,
      ticketsUrgent: 3,
      ticketsResolvedToday: 8,
      playersPendingKYC: 5,
    });
    expect(result.myTickets).toEqual([{ id: 1, title: 'Mi ticket asignado' }]);
    expect(result.recentTickets).toEqual([{ id: 2, title: 'Ticket reciente' }]);
    expect(result.ticketsByDepartment).toEqual([
      { department: 'SUPPORT', count: 4 },
      { department: 'PAYMENTS', count: 2 },
    ]);
  });
});
});