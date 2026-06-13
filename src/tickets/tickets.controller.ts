import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() body: {
      title: string;
      description: string;
      department: string;
      priority: string;
      playerId?: number;
      assignedToId?: number;
    },
    @Request() req,
  ) {
    return this.ticketsService.create(
      body.title,
      body.description,
      body.department,
      body.priority,
      req.user.id,
      body.playerId,
      body.assignedToId,
    );
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('priority') priority?: string,
    @Query('createdById') createdById?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.ticketsService.findAll({
      status,
      department,
      priority,
      createdById: createdById ? parseInt(createdById) : undefined,
      assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @Request() req,
  ) {
    return this.ticketsService.updateStatus(id, body.status, req.user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      title?: string;
      description?: string;
      priority?: string;
      department?: string;
      assignedToId?: number;
    },
  ) {
    return this.ticketsService.update(id, body);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.ticketsService.addComment(id, body.content, req.user.id);
  }
}