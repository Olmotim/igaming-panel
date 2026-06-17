import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PlayersService } from './players.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  create(@Body() body: { email: string; firstName: string; lastName: string }) {
    return this.playersService.create(body.email, body.firstName, body.lastName);
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
      nationality?: string;
      country?: string;
      city?: string;
      address?: string;
      language?: string;
      tags?: string[];
    },
  ) {
    return this.playersService.update(id, {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    });
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.playersService.updateStatus(id, body.status);
  }

  @Put(':id/balances')
  updateBalances(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { realBalance?: number; bonusBalance?: number },
  ) {
    return this.playersService.updateBalances(id, body.realBalance, body.bonusBalance);
  }

  @Put(':id/restrictions')
  updateRestrictions(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      canDeposit?: boolean;
      canWithdraw?: boolean;
      canBet?: boolean;
      canReceiveBonus?: boolean;
      canLogin?: boolean;
    },
  ) {
    return this.playersService.updateRestrictions(id, body);
  }

  @Put(':id/risk')
  updateRisk(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      riskLevel?: string;
      isPEP?: boolean;
      sofVerified?: boolean;
      riskNotes?: string;
    },
  ) {
    return this.playersService.updateRisk(id, body);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
    @Request() req,
  ) {
    return this.playersService.addNote(id, body.content, req.user.id);
  }

  // ---- KYC ----

  @Get(':id/kyc')
  getKYC(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getKYC(id);
  }

  @Put(':id/kyc')
  upsertKYC(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      kycLevel?: string;
      idDocType?: string;
      idDocNumber?: string;
      idDocExpiry?: string;
      idDocIssuingCountry?: string;
      idDocStatus?: string;
      idDocUrl?: string;
      poaDocType?: string;
      poaDocStatus?: string;
      poaDocUrl?: string;
      sofDocStatus?: string;
      sofDocUrl?: string;
      sofDescription?: string;
      pepStatus?: string;
      pepNotes?: string;
    },
    @Request() req,
  ) {
    return this.playersService.upsertKYC(
      id,
      {
        ...body,
        idDocExpiry: body.idDocExpiry ? new Date(body.idDocExpiry) : undefined,
      },
      req.user.id,
    );
  }

  // ---- Payments ----

  @Get(':id/payments')
  getPayments(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getPayments(id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type: string;
      amount: number;
      currency?: string;
      status?: string;
      paymentMethod?: string;
      accountNumber?: string;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.playersService.addPayment(id, body);
  }

  @Put('payments/:paymentId/status')
  updatePaymentStatus(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() body: { status: string },
  ) {
    return this.playersService.updatePaymentStatus(paymentId, body.status);
  }

  // ---- Bonuses ----

  @Get(':id/bonuses')
  getBonuses(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getBonuses(id);
  }

  @Post(':id/bonuses')
  addBonus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type: string;
      description?: string;
      amount: number;
      wagering?: number;
      maxWinAmount?: number;
      expiresAt?: string;
    },
    @Request() req,
  ) {
    return this.playersService.addBonus(
      id,
      {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
      req.user.id,
    );
  }

  @Put('bonuses/:bonusId/status')
  updateBonusStatus(
    @Param('bonusId', ParseIntPipe) bonusId: number,
    @Body() body: { status: string },
  ) {
    return this.playersService.updateBonusStatus(bonusId, body.status);
  }

  // ---- Responsible Gaming ----

  @Get(':id/rg')
  getRGLimits(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getRGLimits(id);
  }

  @Post(':id/rg')
  addRGLimit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type: string;
      period?: string;
      amount?: number;
      duration?: number;
      endDate?: string;
      coolingOffUntil?: string;
      excludedUntil?: string;
      therapyFlag?: boolean;
    },
  ) {
    return this.playersService.addRGLimit(id, {
      ...body,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      coolingOffUntil: body.coolingOffUntil ? new Date(body.coolingOffUntil) : undefined,
      excludedUntil: body.excludedUntil ? new Date(body.excludedUntil) : undefined,
    });
  }

  @Put('rg/:limitId/status')
  updateRGLimitStatus(
    @Param('limitId', ParseIntPipe) limitId: number,
    @Body() body: { status: string },
  ) {
    return this.playersService.updateRGLimitStatus(limitId, body.status);
  }

  // ---- Login History ----

  @Get(':id/login-history')
  getLoginHistory(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getLoginHistory(id);
  }
}