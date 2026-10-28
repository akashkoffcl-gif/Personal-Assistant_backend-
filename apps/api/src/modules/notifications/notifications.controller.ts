import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionPayload } from '@assistant/shared';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  getVapidKey() {
    return {
      publicKey: this.notificationsService.getPublicKey(),
    };
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: PushSubscriptionPayload,
  ) {
    const sub = await this.notificationsService.saveSubscription(user.id, payload);
    return { success: true, subscription: sub };
  }

  @Delete('subscriptions/:id')
  async unsubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') subscriptionId: string,
  ) {
    return this.notificationsService.revokeSubscription(user.id, subscriptionId);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestPush(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.notificationsService.notifyUser(user.id, {
      title: '🔔 Test Notification',
      body: 'Push notification infrastructure is connected and operational.',
    });
    return { success: true, ...result };
  }
}

