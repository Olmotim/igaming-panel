import { Controller, Get, Put, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserDepartmentDto } from './dto/update-user-department.dto';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Put('users/:id/department')
updateUserDepartment(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateUserDepartmentDto,
) {
  return this.adminService.updateUserDepartment(id, dto.department);
}
}