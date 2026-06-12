import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workspaces/:workspaceId/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Body() body: { title: string; description?: string; assignedTo?: number },
    @Request() req,
  ) {
    return this.tasksService.create(workspaceId, body.title, body.description, body.assignedTo, req.user.id);
  }

  @Get()
  findAll(@Param('workspaceId', ParseIntPipe) workspaceId: number, @Request() req) {
    return this.tasksService.findAll(workspaceId, req.user.id);
  }

  @Put(':taskId')
  updateStatus(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: { status: string },
    @Request() req,
  ) {
    return this.tasksService.updateStatus(taskId, body.status, req.user.id);
  }

  @Delete(':taskId')
  remove(@Param('taskId', ParseIntPipe) taskId: number, @Request() req) {
    return this.tasksService.remove(taskId, req.user.id);
  }
}