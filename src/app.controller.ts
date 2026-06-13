import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AdminService } from './admin/admin.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/metrics')
  getDashboardMetrics(@Request() req) {
    return this.adminService.getDashboardMetrics(req.user.id);
  }
}