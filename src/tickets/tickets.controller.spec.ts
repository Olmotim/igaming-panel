import { Test, TestingModule } from '@nestjs/testing';
import { Department, Role, TicketPriority } from '@prisma/client';
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
      const mockRequest = { user: { id: 7, role: Role.AGENT, department: Department.SUPPORT } };
      const body = {
        title: 'No carga el dashboard',
        description: 'Error 500 al entrar',
        department: Department.SUPPORT,
        priority: TicketPriority.HIGH,
      };
      ticketsService.create.mockResolvedValue({ id: 1, ...body });

      // Act
      await controller.create(body, mockRequest);

      // Assert
      expect(ticketsService.create).toHaveBeenCalledWith(
        'No carga el dashboard',
        'Error 500 al entrar',
        Department.SUPPORT,
        TicketPriority.HIGH,
        7, // req.user.id
        undefined, // playerId
        undefined, // assignedToId
      );
    });
  });

  describe('findAll', () => {
    it('debería pasar los datos del usuario y convertir los query params de string a number', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.AGENT, department: Department.SUPPORT } };
      ticketsService.findAll.mockResolvedValue([]);

      // Act: los query params SIEMPRE llegan como strings desde la URL
      await controller.findAll(mockRequest, 'OPEN', Department.PAYMENTS, 'HIGH', '3', '9');

      // Assert: deben llegar al service ya convertidos a número
      expect(ticketsService.findAll).toHaveBeenCalledWith(7, Role.AGENT, Department.SUPPORT, {
        status: 'OPEN',
        department: Department.PAYMENTS,
        priority: 'HIGH',
        createdById: 3,
        assignedToId: 9,
      });
    });

    it('debería pasar undefined en createdById/assignedToId cuando no vienen en la query', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.ADMIN, department: null } };
      ticketsService.findAll.mockResolvedValue([]);

      // Act: sin query params opcionales
      await controller.findAll(mockRequest);

      // Assert
      expect(ticketsService.findAll).toHaveBeenCalledWith(7, Role.ADMIN, null, {
        status: undefined,
        department: undefined,
        priority: undefined,
        createdById: undefined,
        assignedToId: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('debería llamar a ticketsService.findOne con el id parseado y el usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.ADMIN, department: null } };
      const mockTicket = { id: 5, title: 'Ticket existente' };
      ticketsService.findOne.mockResolvedValue(mockTicket);

      // Act
      const result = await controller.findOne(5, mockRequest);

      // Assert
      expect(ticketsService.findOne).toHaveBeenCalledWith(5, mockRequest.user);
      expect(result).toEqual(mockTicket);
    });
  });

  describe('updateStatus', () => {
    it('debería llamar a ticketsService.updateStatus con id, status del body, y el usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.AGENT, department: Department.SUPPORT } };
      ticketsService.updateStatus.mockResolvedValue({ id: 1, status: 'RESOLVED' });

      // Act
      await controller.updateStatus(1, { status: 'RESOLVED' }, mockRequest);

      // Assert
      expect(ticketsService.updateStatus).toHaveBeenCalledWith(1, 'RESOLVED', mockRequest.user);
    });
  });

  describe('update', () => {
    it('debería llamar a ticketsService.update con el id, los datos del body, y el usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.AGENT, department: Department.SUPPORT } };
      ticketsService.update.mockResolvedValue({ id: 1, title: 'Actualizado' });

      // Act
      await controller.update(1, { title: 'Actualizado' }, mockRequest);

      // Assert
      expect(ticketsService.update).toHaveBeenCalledWith(1, { title: 'Actualizado' }, mockRequest.user);
    });
  });

  describe('addComment', () => {
    it('debería llamar a ticketsService.addComment con id, contenido, y el usuario autenticado', async () => {
      // Arrange
      const mockRequest = { user: { id: 7, role: Role.AGENT, department: Department.SUPPORT } };
      ticketsService.addComment.mockResolvedValue({ id: 1, content: 'Comentario' });

      // Act
      await controller.addComment(1, { content: 'Comentario' }, mockRequest);

      // Assert
      expect(ticketsService.addComment).toHaveBeenCalledWith(1, 'Comentario', mockRequest.user);
    });
  });
});
