import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

describe('TicketsController', () => {
  let controller: TicketsController;
  let ticketsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    addComment: jest.Mock;
  };

  beforeEach(async () => {
    ticketsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      addComment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debería llamar a ticketsService.create con los datos del body y el id del usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: 'agent', department: 'support' } };
      const body = {
        title: 'No carga el dashboard',
        description: 'Error 500 al entrar',
        department: 'support',
        priority: 'HIGH',
      };
      ticketsService.create.mockResolvedValue({ id: 1, ...body });

      // Act
      await controller.create(body, mockRequest);

      // Assert
      expect(ticketsService.create).toHaveBeenCalledWith(
        'No carga el dashboard',
        'Error 500 al entrar',
        'support',
        'HIGH',
        7, // req.user.id
        undefined, // playerId
        undefined, // assignedToId
      );
    });
  });

  describe('findAll', () => {
    it('debería pasar los datos del usuario y convertir los query params de string a number', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: 'agent', department: 'support' } };
      ticketsService.findAll.mockResolvedValue([]);

      // Act: los query params SIEMPRE llegan como strings desde la URL
      await controller.findAll(mockRequest, 'OPEN', 'PAYMENTS', 'HIGH', '3', '9');

      // Assert: deben llegar al service ya convertidos a número
      expect(ticketsService.findAll).toHaveBeenCalledWith(7, 'agent', 'support', {
        status: 'OPEN',
        department: 'PAYMENTS',
        priority: 'HIGH',
        createdById: 3,
        assignedToId: 9,
      });
    });

    it('debería pasar undefined en createdById/assignedToId cuando no vienen en la query', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: 'admin', department: null } };
      ticketsService.findAll.mockResolvedValue([]);

      // Act: sin query params opcionales
      await controller.findAll(mockRequest);

      // Assert
      expect(ticketsService.findAll).toHaveBeenCalledWith(7, 'admin', null, {
        status: undefined,
        department: undefined,
        priority: undefined,
        createdById: undefined,
        assignedToId: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('debería llamar a ticketsService.findOne con el id parseado', async () => {
      // Arrange
      const mockTicket = { id: 5, title: 'Ticket existente' };
      ticketsService.findOne.mockResolvedValue(mockTicket);

      // Act
      const result = await controller.findOne(5);

      // Assert
      expect(ticketsService.findOne).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockTicket);
    });
  });

  describe('updateStatus', () => {
    it('debería llamar a ticketsService.updateStatus con id, status del body, y el id del usuario', async () => {
      // Arrange
      const mockRequest = { user: { id: 7 } };
      ticketsService.updateStatus.mockResolvedValue({ id: 1, status: 'RESOLVED' });

      // Act
      await controller.updateStatus(1, { status: 'RESOLVED' }, mockRequest);

      // Assert
      expect(ticketsService.updateStatus).toHaveBeenCalledWith(1, 'RESOLVED', 7);
    });
  });

  describe('update', () => {
    it('debería llamar a ticketsService.update con el id y los datos del body', async () => {
      // Arrange
      ticketsService.update.mockResolvedValue({ id: 1, title: 'Actualizado' });

      // Act
      await controller.update(1, { title: 'Actualizado' });

      // Assert
      expect(ticketsService.update).toHaveBeenCalledWith(1, { title: 'Actualizado' });
    });
  });

  describe('addComment', () => {
    it('debería llamar a ticketsService.addComment con id, contenido, y el id del usuario', async () => {
      // Arrange
      const mockRequest = { user: { id: 7 } };
      ticketsService.addComment.mockResolvedValue({ id: 1, content: 'Comentario' });

      // Act
      await controller.addComment(1, { content: 'Comentario' }, mockRequest);

      // Assert
      expect(ticketsService.addComment).toHaveBeenCalledWith(1, 'Comentario', 7);
    });
  });
});