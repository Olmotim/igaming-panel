// Scaffolding inicial de un Kanban genérico, mantenido en el repo por si se reutiliza en el
// futuro. No forma parte del flujo activo del backoffice ni está enlazado desde el frontend.
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService, PrismaService],
})
export class TasksModule {}