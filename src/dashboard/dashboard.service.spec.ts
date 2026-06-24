import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    ticket: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
    player: { count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      ticket: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
      player: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
