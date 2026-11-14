import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { MobileService } from './mobile.service';
import {
  InitiateDevicePairingDto,
  ConfirmDevicePairingDto,
  RegisterFcmTokenDto,
  UpdatePermissionsDto,
  IngestMobileEventDto,
  ExecuteMobileCommandDto,
  RespondMobileCommandDto,
} from './dto/mobile.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('mobile')
@UseGuards(SupabaseAuthGuard)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Post('pair/initiate')
  async initiatePairing(@Req() req: any, @Body() dto: InitiateDevicePairingDto) {
    const userId = req.user.id;
    return this.mobileService.initiatePairing(userId, dto);
  }

  @Post('pair/confirm')
  async confirmPairing(@Req() req: any, @Body() dto: ConfirmDevicePairingDto) {
    const userId = req.user.id;
    return this.mobileService.confirmPairing(userId, dto);
  }

  @Get('devices')
  async getDevices(@Req() req: any) {
    const userId = req.user.id;
    return this.mobileService.getDevices(userId);
  }

  @Delete('devices/:id')
  async revokeDevice(@Req() req: any, @Param('id') deviceId: string) {
    const userId = req.user.id;
    return this.mobileService.revokeDevice(userId, deviceId);
  }

  @Post('permissions')
  async updatePermissions(@Req() req: any, @Body() dto: UpdatePermissionsDto) {
    const userId = req.user.id;
    return this.mobileService.updatePermissions(userId, dto);
  }

  @Post('push-token')
  async registerPushToken(@Req() req: any, @Body() dto: RegisterFcmTokenDto) {
    const userId = req.user.id;
    return this.mobileService.registerPushToken(userId, dto);
  }

  @Post('events')
  async ingestEvent(@Req() req: any, @Body() dto: IngestMobileEventDto) {
    const userId = req.user.id;
    return this.mobileService.ingestEvent(userId, dto);
  }

  @Get('events')
  async getEvents(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.id;
    return this.mobileService.getEvents(userId, limit ? parseInt(limit, 10) : 30);
  }

  @Post('commands')
  async executeCommand(@Req() req: any, @Body() dto: ExecuteMobileCommandDto) {
    const userId = req.user.id;
    return this.mobileService.executeCommand(userId, dto);
  }

  @Post('commands/respond')
  async respondCommand(@Req() req: any, @Body() dto: RespondMobileCommandDto) {
    const userId = req.user.id;
    return this.mobileService.respondCommand(userId, dto);
  }
}

