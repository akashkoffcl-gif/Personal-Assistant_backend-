import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../common/prisma.service';
import { PushSubscriptionPayload } from '@assistant/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {
    this.configureVapid();
  }

  private configureVapid() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@assistant.local';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.vapidConfigured = true;
        this.logger.log('Web Push VAPID keys initialized.');
      } catch (err: any) {
        this.logger.warn(`Failed to configure VAPID: ${err?.message}`);
      }
    } else {
      // Auto-generate ephemeral VAPID keys for local development if none provided
      const ephemeralKeys = webpush.generateVAPIDKeys();
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ephemeralKeys.publicKey;
      process.env.VAPID_PRIVATE_KEY = ephemeralKeys.privateKey;
      webpush.setVapidDetails(subject, ephemeralKeys.publicKey, ephemeralKeys.privateKey);
      this.vapidConfigured = true;
      this.logger.log(`Initialized development VAPID keys. Public: ${ephemeralKeys.publicKey.slice(0, 16)}...`);
    }
  }

  public getPublicKey(): string {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  async saveSubscription(userId: string, payload: PushSubscriptionPayload) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-sub-id', ...payload, isActive: true };
    }

    return this.prisma.pushSubscription.upsert({
      where: { endpoint: payload.endpoint },
      update: {
        userId,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        deviceType: payload.deviceType || 'desktop',
        userAgent: payload.userAgent,
        isActive: true,
      },
      create: {
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        deviceType: payload.deviceType || 'desktop',
        userAgent: payload.userAgent,
        isActive: true,
      },
    });
  }

  async revokeSubscription(userId: string, subscriptionId: string) {
    if (!this.prisma.isConnected) return { success: true };

    await this.prisma.pushSubscription.updateMany({
      where: { id: subscriptionId, userId },
      data: { isActive: false },
    });
    return { success: true };
  }

  async sendPushNotification(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: {
      title: string;
      body: string;
      taskId?: string;
      category?: string;
      url?: string;
      actions?: Array<{ action: string; title: string }>;
    },
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    const notificationString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        taskId: payload.taskId,
        url: payload.url || '/dashboard',
        category: payload.category,
      },
      actions: payload.actions || [
        { action: 'complete', title: '✓ Completed' },
        { action: 'snooze', title: '⏱ Snooze 15m' },
        { action: 'open', title: 'Open Task' },
      ],
    });

    try {
      const response = await webpush.sendNotification(pushSubscription, notificationString);
      return { success: true, statusCode: response.statusCode };
    } catch (err: any) {
      this.logger.error(`Push notification delivery error: ${err?.message}`);
      // If subscription expired (404/410), deactivate it
      if (err.statusCode === 404 || err.statusCode === 410) {
        if (this.prisma.isConnected) {
          await this.prisma.pushSubscription.updateMany({
            where: { endpoint: subscription.endpoint },
            data: { isActive: false },
          });
        }
      }
      return { success: false, statusCode: err.statusCode, error: err?.message };
    }
  }

  async notifyUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      taskId?: string;
      category?: string;
    },
  ) {
    // 1. Always create persistent In-App Notification record so it appears in Notification Center
    try {
      await this.createInAppNotification(userId, {
        title: notification.title,
        message: notification.body,
        category: notification.category || 'REMINDERS',
        severity: 'INFO',
        actionUrl: notification.taskId ? `/work?task=${notification.taskId}` : undefined,
        metadata: { taskId: notification.taskId },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to persist in-app notification: ${err?.message}`);
    }

    // 2. Dispatch Web Push if active subscriptions exist
    if (!this.prisma.isConnected) {
      this.logger.log(`[Push Notification Mock] User: ${userId} - ${notification.title}: ${notification.body}`);
      return { deliveredCount: 0 };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    let delivered = 0;
    for (const sub of subscriptions) {
      const result = await this.sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notification,
      );
      if (result.success) delivered++;
    }

    return { deliveredCount: delivered, totalSubscriptions: subscriptions.length };
  }

  // Persistent In-App Notification Center Methods
  async createInAppNotification(
    userId: string,
    data: {
      title: string;
      message: string;
      category?: string;
      severity?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
    },
  ) {
    if (!this.prisma.isConnected) {
      return {
        id: 'mock-notif-' + Date.now(),
        userId,
        ...data,
        category: data.category || 'SYSTEM',
        severity: data.severity || 'INFO',
        readAt: null,
        createdAt: new Date(),
      };
    }

    return this.prisma.inAppNotification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        category: data.category || 'SYSTEM',
        severity: data.severity || 'INFO',
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
      },
    });
  }

  async getNotifications(
    userId: string,
    options?: {
      category?: string;
      unreadOnly?: boolean;
      limit?: number;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { unreadCount: 0, totalCount: 0, notifications: [] };
    }

    const where: any = { userId };
    if (options?.category && options.category !== 'ALL') {
      where.category = options.category;
    }
    if (options?.unreadOnly) {
      where.readAt = null;
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
      }),
      this.prisma.inAppNotification.count({
        where: { userId, readAt: null },
      }),
      this.prisma.inAppNotification.count({
        where: { userId },
      }),
    ]);

    return {
      unreadCount,
      totalCount,
      notifications,
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    if (!this.prisma.isConnected) return { success: true };

    await this.prisma.inAppNotification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    if (!this.prisma.isConnected) return { success: true, count: 0 };

    const result = await this.prisma.inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, count: result.count };
  }

  async deleteNotification(userId: string, notificationId: string) {
    if (!this.prisma.isConnected) return { success: true };

    await this.prisma.inAppNotification.deleteMany({
      where: { id: notificationId, userId },
    });
    return { success: true };
  }
}

