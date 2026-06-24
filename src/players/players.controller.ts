import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PlayersService } from './players.service';
import { PlayersKycService } from './players-kyc.service';
import { PlayersPaymentsService } from './players-payments.service';
import { PlayersBonusesService } from './players-bonuses.service';
import { PlayersRgService } from './players-rg.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { UpdatePlayerStatusDto } from './dto/update-player-status.dto';
import { UpdateBalancesDto } from './dto/update-balances.dto';
import { UpdateRestrictionsDto } from './dto/update-restrictions.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { UpsertKycDto } from './dto/upsert-kyc.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { AddBonusDto } from './dto/add-bonus.dto';
import { UpdateBonusStatusDto } from './dto/update-bonus-status.dto';
import { AddRgLimitDto } from './dto/add-rg-limit.dto';
import { UpdateRgLimitStatusDto } from './dto/update-rg-limit-status.dto';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(
    private readonly playersService: PlayersService,
    private readonly kycService: PlayersKycService,
    private readonly paymentsService: PlayersPaymentsService,
    private readonly bonusesService: PlayersBonusesService,
    private readonly rgService: PlayersRgService,
  ) {}

  // ---- Account ----

  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto.email, dto.firstName, dto.lastName);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.playersService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(id, dto);
  }

  @Put(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlayerStatusDto, @Request() req) {
    return this.playersService.updateStatus(id, dto.status, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/balances')
  updateBalances(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBalancesDto) {
    return this.playersService.updateBalances(id, dto.realBalance, dto.bonusBalance);
  }

  @Put(':id/restrictions')
  updateRestrictions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRestrictionsDto) {
    return this.playersService.updateRestrictions(id, dto);
  }

  @Put(':id/risk')
  updateRisk(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRiskDto, @Request() req) {
    return this.playersService.updateRisk(id, dto, req.user);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddNoteDto,
    @Request() req,
  ) {
    return this.playersService.addNote(id, dto.content, req.user.id);
  }

  @Get(':id/login-history')
  getLoginHistory(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getLoginHistory(id);
  }

  // ---- KYC ----

  @Get(':id/kyc')
  getKYC(@Param('id', ParseIntPipe) id: number) {
    return this.kycService.getKYC(id);
  }

  @Put(':id/kyc')
  upsertKYC(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertKycDto,
    @Request() req,
  ) {
    return this.kycService.upsertKYC(id, dto, req.user.id, req.user);
  }

  // ---- Payments ----

  @Get(':id/payments')
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPayments(id);
  }

  @Post(':id/payments')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: AddPaymentDto, @Request() req) {
    return this.paymentsService.addPayment(id, dto, req.user);
  }

  @Put('payments/:paymentId/status')
  updatePaymentStatus(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() dto: UpdatePaymentStatusDto,
    @Request() req,
  ) {
    return this.paymentsService.updatePaymentStatus(paymentId, dto.status, req.user);
  }

  // ---- Bonuses ----

  @Get(':id/bonuses')
  getBonuses(@Param('id', ParseIntPipe) id: number) {
    return this.bonusesService.getBonuses(id);
  }

  @Post(':id/bonuses')
  addBonus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddBonusDto,
    @Request() req,
  ) {
    return this.bonusesService.addBonus(id, dto, req.user.id, req.user);
  }

  @Put('bonuses/:bonusId/status')
  updateBonusStatus(
    @Param('bonusId', ParseIntPipe) bonusId: number,
    @Body() dto: UpdateBonusStatusDto,
    @Request() req,
  ) {
    return this.bonusesService.updateBonusStatus(bonusId, dto.status, req.user);
  }

  // ---- Responsible Gaming ----

  @Get(':id/rg')
  getRGLimits(@Param('id', ParseIntPipe) id: number) {
    return this.rgService.getRGLimits(id);
  }

  @Post(':id/rg')
  addRGLimit(@Param('id', ParseIntPipe) id: number, @Body() dto: AddRgLimitDto) {
    return this.rgService.addRGLimit(id, dto);
  }

  @Put('rg/:limitId/status')
  updateRGLimitStatus(
    @Param('limitId', ParseIntPipe) limitId: number,
    @Body() dto: UpdateRgLimitStatusDto,
  ) {
    return this.rgService.updateRGLimitStatus(limitId, dto.status);
  }
}
