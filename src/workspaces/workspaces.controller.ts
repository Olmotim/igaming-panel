import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() body: { name: string }, @Request() req) {
    return this.workspacesService.create(body.name, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.workspacesService.findAllForUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: { name: string }, @Request() req) {
    return this.workspacesService.update(id, body.name, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.workspacesService.remove(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id', ParseIntPipe) id: number, @Body() body: { email: string }, @Request() req) {
    return this.workspacesService.addMember(id, body.email, req.user.id);
  }
}