import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    ticket: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    ticketComment: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      ticket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ticketComment: {
        create: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería crear el ticket con el department convertido a mayúsculas', async () => {
      // Arrange
      const expectedTicket = {
        id: 1,
        title: 'No puedo acceder a mi cuenta',
        description: 'El login me da error 500',
        department: 'SUPPORT',
        priority: 'HIGH',
        createdById: 1,
      };
      prisma.ticket.create.mockResolvedValue(expectedTicket);

      // Act: mandamos el department en minúsculas a propósito
      const result = await service.create(
        'No puedo acceder a mi cuenta',
        'El login me da error 500',
        'support',
        'HIGH',
        1,
      );

      // Assert
      expect(result).toEqual(expectedTicket);
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: 'No puedo acceder a mi cuenta',
          description: 'El login me da error 500',
          department: 'SUPPORT', // verificamos que SÍ se convirtió a mayúsculas
          priority: 'HIGH',
          createdById: 1,
          playerId: undefined,
          assignedToId: undefined,
        },
        include: {
          createdBy: { select: { id: true, email: true } },
          assignedTo: { select: { id: true, email: true } },
          player: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });

    it('debería crear el ticket asociado a un jugador y a un agente asignado', async () => {
      // Arrange
      const expectedTicket = {
        id: 2,
        title: 'Solicitud de retiro pendiente',
        department: 'PAYMENTS',
        playerId: 10,
        assignedToId: 3,
      };
      prisma.ticket.create.mockResolvedValue(expectedTicket);

      // Act
      const result = await service.create(
        'Solicitud de retiro pendiente',
        'El jugador reporta que su retiro lleva 3 días',
        'payments',
        'MEDIUM',
        1,
        10, // playerId
        3,  // assignedToId
      );

      // Assert
      expect(result).toEqual(expectedTicket);
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playerId: 10,
            assignedToId: 3,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('debería devolver todos los tickets sin filtro de departamento cuando un admin no especifica uno', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(1, 'admin', null, {});

      // Assert: el where NO debe tener la propiedad department
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('debería respetar el filtro de departamento que pide un admin', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act: el admin pide ver solo tickets de PAYMENTS
      await service.findAll(1, 'admin', null, { department: 'PAYMENTS' });

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: 'PAYMENTS' },
        }),
      );
    });

    it('debería forzar el departamento del agente, IGNORANDO cualquier filtro de departamento que envíe', async () => {
      // Arrange: un agente de SUPPORT intenta pedir tickets de PAYMENTS
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, 'agent', 'support', { department: 'PAYMENTS' });

      // Assert: el sistema debe usar SUPPORT (su propio departamento), no PAYMENTS
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: 'SUPPORT' },
        }),
      );
    });

    it('debería filtrar por el departamento propio del agente cuando no manda ningún filtro', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, 'agent', 'payments', {});

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: 'PAYMENTS' },
        }),
      );
    });

    it('debería combinar el filtro de departamento del agente con otros filtros adicionales', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, 'agent', 'support', { status: 'OPEN', priority: 'HIGH' });

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: 'SUPPORT', status: 'OPEN', priority: 'HIGH' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería devolver el ticket con sus relaciones cuando existe', async () => {
      // Arrange
      const mockTicket = { id: 1, title: 'Problema de login', comments: [] };
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      const result = await service.findOne(1);

      // Assert
      expect(result).toEqual(mockTicket);
    });

    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update(999, { title: 'Nuevo título' })).rejects.toThrow(NotFoundException);
    });

    it('debería actualizar el ticket cuando existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, title: 'Viejo título' });
      prisma.ticket.update.mockResolvedValue({ id: 1, title: 'Nuevo título' });

      // Act
      const result = await service.update(1, { title: 'Nuevo título' });

      // Assert
      expect(result).toEqual({ id: 1, title: 'Nuevo título' });
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { title: 'Nuevo título' },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updateStatus(999, 'RESOLVED', 1)).rejects.toThrow(NotFoundException);
    });

    it('debería setear resolvedAt cuando el status cambia a RESOLVED', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, status: 'OPEN', resolvedAt: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, status: 'RESOLVED' });

      // Act
      await service.updateStatus(1, 'RESOLVED', 5);

      // Assert: resolvedAt debe ser una fecha real, no null
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
        }),
      );
    });

    it('NO debería modificar resolvedAt cuando el status cambia a algo distinto de RESOLVED', async () => {
      // Arrange: el ticket nunca se resolvió (resolvedAt es null)
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, status: 'OPEN', resolvedAt: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });

      // Act
      await service.updateStatus(1, 'IN_PROGRESS', 5);

      // Assert: resolvedAt debe seguir siendo null, no se inventa una fecha
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'IN_PROGRESS', resolvedAt: null },
        }),
      );
    });
  });

  describe('addComment', () => {
    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.addComment(999, 'comentario', 1)).rejects.toThrow(NotFoundException);
    });

    it('debería crear el comentario cuando el ticket existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, title: 'Ticket existente' });

      const expectedComment = { id: 1, content: 'Ya reviso esto', ticketId: 1, authorId: 5 };
      prisma.ticketComment.create.mockResolvedValue(expectedComment);

      // Act
      const result = await service.addComment(1, 'Ya reviso esto', 5);

      // Assert
      expect(result).toEqual(expectedComment);
      expect(prisma.ticketComment.create).toHaveBeenCalledWith({
        data: { content: 'Ya reviso esto', ticketId: 1, authorId: 5 },
        include: { author: { select: { id: true, email: true } } },
      });
    });
  });
});