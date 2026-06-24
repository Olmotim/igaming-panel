import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Department, Role } from '@prisma/client';
import { ActingUser } from '../auth/authorization.helper';

const admin: ActingUser = { id: 1, role: Role.ADMIN, department: null };
const supportAgent: ActingUser = { id: 2, role: Role.AGENT, department: Department.SUPPORT };
const paymentsAgent: ActingUser = { id: 3, role: Role.AGENT, department: Department.PAYMENTS };
const supportSupervisor: ActingUser = { id: 4, role: Role.SUPERVISOR, department: Department.SUPPORT };

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
    it('debería crear el ticket con el department recibido', async () => {
      // Arrange
      const expectedTicket = {
        id: 1,
        title: 'No puedo acceder a mi cuenta',
        description: 'El login me da error 500',
        department: Department.SUPPORT,
        priority: 'HIGH',
        createdById: 1,
      };
      prisma.ticket.create.mockResolvedValue(expectedTicket);

      // Act
      const result = await service.create(
        'No puedo acceder a mi cuenta',
        'El login me da error 500',
        Department.SUPPORT,
        'HIGH',
        1,
      );

      // Assert
      expect(result).toEqual(expectedTicket);
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          title: 'No puedo acceder a mi cuenta',
          description: 'El login me da error 500',
          department: Department.SUPPORT,
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
        department: Department.PAYMENTS,
        playerId: 10,
        assignedToId: 3,
      };
      prisma.ticket.create.mockResolvedValue(expectedTicket);

      // Act
      const result = await service.create(
        'Solicitud de retiro pendiente',
        'El jugador reporta que su retiro lleva 3 días',
        Department.PAYMENTS,
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
      await service.findAll(1, Role.ADMIN, null, {});

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
      await service.findAll(1, Role.ADMIN, null, { department: Department.PAYMENTS });

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: Department.PAYMENTS },
        }),
      );
    });

    it('debería forzar el departamento del agente, IGNORANDO cualquier filtro de departamento que envíe', async () => {
      // Arrange: un agente de SUPPORT intenta pedir tickets de PAYMENTS
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, Role.AGENT, Department.SUPPORT, { department: Department.PAYMENTS });

      // Assert: el sistema debe usar SUPPORT (su propio departamento), no PAYMENTS
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: Department.SUPPORT },
        }),
      );
    });

    it('debería filtrar por el departamento propio del agente cuando no manda ningún filtro', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, Role.AGENT, Department.PAYMENTS, {});

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: Department.PAYMENTS },
        }),
      );
    });

    it('debería combinar el filtro de departamento del agente con otros filtros adicionales', async () => {
      // Arrange
      prisma.ticket.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(2, Role.AGENT, Department.SUPPORT, { status: 'OPEN', priority: 'HIGH' });

      // Assert
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { department: Department.SUPPORT, status: 'OPEN', priority: 'HIGH' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería devolver el ticket cuando el usuario es del mismo departamento', async () => {
      // Arrange
      const mockTicket = { id: 1, title: 'Problema de login', department: Department.SUPPORT, createdById: 99, assignedToId: null, comments: [] };
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);

      // Act
      const result = await service.findOne(1, supportAgent);

      // Assert
      expect(result).toEqual(mockTicket);
    });

    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findOne(999, admin)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el agente es de otro departamento y no es creador/asignado', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({
        id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: null,
      });

      // Act + Assert
      await expect(service.findOne(1, supportAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir el acceso al creador del ticket aunque sea de otro departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({
        id: 1, department: Department.PAYMENTS, createdById: supportAgent.id, assignedToId: null,
      });

      // Act + Assert
      await expect(service.findOne(1, supportAgent)).resolves.toBeDefined();
    });

    it('debería permitir el acceso a un ADMIN sin importar el departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({
        id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: null,
      });

      // Act + Assert
      await expect(service.findOne(1, admin)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.update(999, { title: 'Nuevo título' }, admin)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el agente es de otro departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: null });

      // Act + Assert
      await expect(service.update(1, { title: 'Nuevo título' }, supportAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería actualizar el ticket cuando el agente es de su propio departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, title: 'Viejo título', department: Department.SUPPORT, createdById: 99, assignedToId: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, title: 'Nuevo título' });

      // Act
      const result = await service.update(1, { title: 'Nuevo título' }, supportAgent);

      // Assert
      expect(result).toEqual({ id: 1, title: 'Nuevo título' });
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { title: 'Nuevo título' },
        }),
      );
    });

    it('debería rechazar a un AGENT que intenta reasignar el departamento del ticket', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.SUPPORT, createdById: 99, assignedToId: null });

      // Act + Assert: reasignar departamento requiere SUPERVISOR+
      await expect(
        service.update(1, { department: Department.PAYMENTS }, supportAgent),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir a un SUPERVISOR de su departamento reasignar el departamento del ticket', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.SUPPORT, createdById: 99, assignedToId: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, department: Department.PAYMENTS });

      // Act + Assert
      await expect(
        service.update(1, { department: Department.PAYMENTS }, supportSupervisor),
      ).resolves.toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('debería lanzar NotFoundException si el ticket no existe', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue(null);

      // Act + Assert
      await expect(service.updateStatus(999, 'RESOLVED', admin)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el agente es de otro departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: null });

      // Act + Assert
      await expect(service.updateStatus(1, 'RESOLVED', supportAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería setear resolvedAt cuando el status cambia a RESOLVED', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, status: 'OPEN', resolvedAt: null, department: Department.SUPPORT, createdById: 99, assignedToId: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, status: 'RESOLVED' });

      // Act
      await service.updateStatus(1, 'RESOLVED', supportAgent);

      // Assert: resolvedAt debe ser una fecha real, no null
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
        }),
      );
    });

    it('NO debería modificar resolvedAt cuando el status cambia a algo distinto de RESOLVED', async () => {
      // Arrange: el ticket nunca se resolvió (resolvedAt es null)
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, status: 'OPEN', resolvedAt: null, department: Department.SUPPORT, createdById: 99, assignedToId: null });
      prisma.ticket.update.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });

      // Act
      await service.updateStatus(1, 'IN_PROGRESS', supportAgent);

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
      await expect(service.addComment(999, 'comentario', admin)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el agente es de otro departamento y no es creador/asignado', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: null });

      // Act + Assert
      await expect(service.addComment(1, 'comentario', supportAgent)).rejects.toThrow(ForbiddenException);
    });

    it('debería permitir comentar al agente asignado aunque sea de otro departamento', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, department: Department.PAYMENTS, createdById: 99, assignedToId: supportAgent.id });

      const expectedComment = { id: 1, content: 'Ya reviso esto', ticketId: 1, authorId: supportAgent.id };
      prisma.ticketComment.create.mockResolvedValue(expectedComment);

      // Act
      const result = await service.addComment(1, 'Ya reviso esto', supportAgent);

      // Assert
      expect(result).toEqual(expectedComment);
      expect(prisma.ticketComment.create).toHaveBeenCalledWith({
        data: { content: 'Ya reviso esto', ticketId: 1, authorId: supportAgent.id },
        include: { author: { select: { id: true, email: true } } },
      });
    });

    it('debería crear el comentario cuando el agente es del mismo departamento del ticket', async () => {
      // Arrange
      prisma.ticket.findUnique.mockResolvedValue({ id: 1, title: 'Ticket existente', department: Department.SUPPORT, createdById: 99, assignedToId: null });

      const expectedComment = { id: 1, content: 'Ya reviso esto', ticketId: 1, authorId: supportAgent.id };
      prisma.ticketComment.create.mockResolvedValue(expectedComment);

      // Act
      const result = await service.addComment(1, 'Ya reviso esto', supportAgent);

      // Assert
      expect(result).toEqual(expectedComment);
    });
  });
});
