import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
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

  // ---------------------------------------------------------------------------
  // Centralized Persistent In-App Notification Center
  // ---------------------------------------------------------------------------
  @Get()
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getNotifications(user.id, {
      category,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(user.id, notificationId);
  }

  @Post('in-app')
  async createInApp(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      message: string;
      category?: string;
      severity?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const notif = await this.notificationsService.createInAppNotification(user.id, body);
    return { success: true, notification: notif };
  }

  // ---------------------------------------------------------------------------
  // Web Push Subscriptions & Infrastructure
  // ---------------------------------------------------------------------------
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

  @Get('subscriptions')
  async getSubscriptions(@CurrentUser() user: AuthenticatedUser) {
    const subs = await this.notificationsService.getActiveSubscriptions(user.id);
    return { success: true, subscriptions: subs };
  }

  @Post('unsubscribe')
  async unsubscribeEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Body('endpoint') endpoint: string,
  ) {
    return this.notificationsService.revokeSubscription(user.id, endpoint);
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

