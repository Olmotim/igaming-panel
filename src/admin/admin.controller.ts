import { Controller, Get, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id/department')
updateUserDepartment(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: { department: string },
) {
  return this.adminService.updateUserDepartment(id, body.department);
}
}