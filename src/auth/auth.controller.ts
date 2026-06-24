import { Controller, Post, Get, Body, UseGuards, Request, Req, Res } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto.email, dto.password);
    res.cookie('refresh_token', tokens.refresh_token, REFRESH_COOKIE_OPTIONS);
    return { access_token: tokens.access_token };
  }

  @Post('refresh')
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.cookies?.refresh_token);
    res.cookie('refresh_token', tokens.refresh_token, REFRESH_COOKIE_OPTIONS);
    return { access_token: tokens.access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/auth' });
    return this.authService.logout(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  getAdmin(@Request() req) {
    return { message: 'Bienvenido al panel de administración', user: req.user };
  }
}
