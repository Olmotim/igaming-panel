import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: { getDashboardMetrics: jest.Mock };

  beforeEach(async () => {
    dashboardService = { getDashboardMetrics: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: dashboardService }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardMetrics', () => {
    it('debería llamar a dashboardService.getDashboardMetrics con el id del usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7 } };
      const expectedResult = { kpis: {}, myTickets: [], recentTickets: [], ticketsByDepartment: [] };
      dashboardService.getDashboardMetrics.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.getDashboardMetrics(mockRequest);

      // Assert
      expect(dashboardService.getDashboardMetrics).toHaveBeenCalledWith(7);
      expect(result).toEqual(expectedResult);
    });
  });
});
