import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { initializeApp, cert, App, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class MobilePushService {
  private readonly logger = new Logger(MobilePushService.name);
  private firebaseApp: App | null = null;
  private isConfigured = false;

  constructor(private readonly prisma: PrismaService) {
    this.initFirebase();
  }

  private initFirebase() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        this.firebaseApp = initializeApp({
          credential: cert(credentials),
          projectId: credentials.project_id || projectId,
        }, 'nova-mobile-companion');
        this.isConfigured = true;
        this.logger.log('Firebase Cloud Messaging (FCM HTTP v1) initialized successfully.');
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Firebase Admin SDK from JSON: ${err?.message}`);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.firebaseApp = initializeApp({
          credential: applicationDefault(),
          projectId,
        }, 'nova-mobile-companion');
        this.isConfigured = true;
        this.logger.log('Firebase Cloud Messaging initialized via default credentials.');
      } catch (err: any) {
        this.logger.warn(`Failed to initialize Firebase Admin SDK via default credentials: ${err?.message}`);
      }
    } else {
      this.logger.log('Firebase credentials not provided in environment. Mobile push will simulate queueing for registered tokens.');
    }
  }

  public isAvailable(): boolean {
    return this.isConfigured && !!this.firebaseApp;
  }

  /**
   * Register or update an active FCM push token for an authenticated mobile device.
   */
  async registerToken(userId: string, deviceId: string, fcmToken: string) {
    return this.prisma.mobilePushToken.upsert({
      where: { fcmToken },
      update: {
        userId,
        deviceId,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        deviceId,
        fcmToken,
        isActive: true,
      },
    });
  }

  /**
   * Send a high-priority data/notification payload to a specific user's active Android devices.
   */
  async sendToDevice(
    deviceId: string,
    payload: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ) {
    const tokens = await this.prisma.mobilePushToken.findMany({
      where: {
        deviceId,
        isActive: true,
      },
    });

    if (!tokens || tokens.length === 0) {
      this.logger.debug(`No active push tokens found for device ${deviceId}`);
      return { sent: 0, failed: 0 };
    }

    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.log(`[FCM-SIMULATED] Message dispatched to device ${deviceId} (${tokens.length} token(s)): ${payload.title}`);
      return { sent: tokens.length, failed: 0, simulated: true };
    }

    let sent = 0;
    let failed = 0;
    const messaging = getMessaging(this.firebaseApp);

    for (const token of tokens) {
      try {
        await messaging.send({
          token: token.fcmToken,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
            notification: {
              channelId: 'nova_jarvis_actions',
              priority: 'max',
              defaultSound: true,
            },
          },
        });
        sent++;
      } catch (err: any) {
        this.logger.warn(`Failed sending FCM to token ${token.fcmToken.slice(0, 10)}...: ${err.message}`);
        failed++;
        if (err.code === 'messaging/registration-token-not-registered') {
          await this.prisma.mobilePushToken.update({
            where: { id: token.id },
            data: { isActive: false },
          });
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Send command payload to device via high-priority background data message.
   */
  async sendCommand(deviceId: string, command: any) {
    return this.sendToDevice(deviceId, {
      title: `Nova Action Request`,
      body: `Command: ${command.commandType}`,
      data: {
        type: 'MOBILE_COMMAND',
        commandId: command.id,
        commandType: command.commandType,
        requiresConfirmation: String(command.requiresConfirmation),
        payload: JSON.stringify(command.payload || {}),
      },
    });
  }
}
