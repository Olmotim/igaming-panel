// Scaffolding inicial de un Kanban genérico, mantenido en el repo por si se reutiliza en el
// futuro. No forma parte del flujo activo del backoffice ni está enlazado desde el frontend.
import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, PrismaService],
})
export class WorkspacesModule {}