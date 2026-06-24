import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { Department, TicketPriority, TicketStatus } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { AddCommentDto } from './dto/add-comment.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(
      dto.title,
      dto.description,
      dto.department,
      dto.priority,
      req.user.id,
      dto.playerId,
      dto.assignedToId,
    );
  }

@Get()
findAll(
  @Request() req,
  @Query('status') status?: TicketStatus,
  @Query('department') department?: Department,
  @Query('priority') priority?: TicketPriority,
  @Query('createdById') createdById?: string,
  @Query('assignedToId') assignedToId?: string,
) {
  return this.ticketsService.findAll(
    req.user.id,
    req.user.role,
    req.user.department ?? null,
    {
      status,
      department,
      priority,
      createdById: createdById ? parseInt(createdById) : undefined,
      assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
    },
  );
}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ticketsService.findOne(id, req.user);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @Request() req,
  ) {
    return this.ticketsService.updateStatus(id, dto.status, req.user);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto, @Request() req) {
    return this.ticketsService.update(id, dto, req.user);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
    @Request() req,
  ) {
    return this.ticketsService.addComment(id, dto.content, req.user);
  }
}
