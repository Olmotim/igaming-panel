import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { AdminModule } from './admin/admin.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { TasksModule } from './tasks/tasks.module';
import { PlayersModule } from './players/players.module';
import { TicketsModule } from './tickets/tickets.module';
import { AdminService } from './admin/admin.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  ScheduleModule.forRoot(),
  AuthModule,
  AdminModule,
  WorkspacesModule,
  TasksModule,
  PlayersModule,
  TicketsModule,
],
  controllers: [AppController],
  providers: [AppService, PrismaService, AdminService],
})
export class AppModule {}