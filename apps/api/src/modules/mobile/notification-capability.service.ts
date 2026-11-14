import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type NotificationCapabilityState =
  | 'PERMISSION_NOT_GRANTED'
  | 'LISTENER_DISCONNECTED'
  | 'SYNC_FAILING'
  | 'FULLY_CONNECTED'
  | 'APP_NOT_APPROVED'
  | 'NO_DEVICE_PAIRED';

export interface NotificationCapabilityStatus {
  state: NotificationCapabilityState;
  hasPairedDevice: boolean;
  deviceName?: string;
  isPermissionGranted: boolean;
  isListenerConnected: boolean;
  approvedAppsCount: number;
  approvedAppPackages: string[];
  lastSyncAt?: string | null;
  recentEventsCount: number;
  recentEvents: Array<{
    id: string;
    appName?: string | null;
    sourceApp: string;
    category: string;
    title?: string | null;
    summary?: string | null;
    occurredAt: string;
  }>;
  aiDirective: string;
}

@Injectable()
export class NotificationCapabilityService {
  private readonly logger = new Logger(NotificationCapabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates the real-time Android Notification Access capability for an authenticated user.
   */
  async getCapabilityStatus(userId: string, targetPackage?: string): Promise<NotificationCapabilityStatus> {
    const now = new Date();

    // 1. Check for Paired Mobile Device
    const device = await this.prisma.mobileDevice.findFirst({
      where: { userId, status: 'PAIRED' },
      include: {
        permissions: true,
        pushTokens: { where: { isActive: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    if (!device) {
      return {
        state: 'NO_DEVICE_PAIRED',
        hasPairedDevice: false,
        isPermissionGranted: false,
        isListenerConnected: false,
        approvedAppsCount: 0,
        approvedAppPackages: [],
        recentEventsCount: 0,
        recentEvents: [],
        aiDirective:
          'NO_DEVICE_PAIRED: The user has not paired an Android companion device with NOVA yet. Instruct the user to pair their phone in the Mobile Companion settings to enable phone notification reading.',
      };
    }

    // 2. Check Permission Record
    const notifPermission = device.permissions.find(
      (p) => p.permissionKey === 'NOTIFICATION_LISTENER',
    );
    const isPermissionGranted = notifPermission?.isGranted ?? false;

    if (!isPermissionGranted) {
      return {
        state: 'PERMISSION_NOT_GRANTED',
        hasPairedDevice: true,
        deviceName: device.deviceName,
        isPermissionGranted: false,
        isListenerConnected: false,
        approvedAppsCount: 0,
        approvedAppPackages: [],
        recentEventsCount: 0,
        recentEvents: [],
        aiDirective: `PERMISSION_NOT_GRANTED: The paired device (${device.deviceName}) has NOT granted Android Notification Access permission. Tell the user to open Android Settings > Notification Access and enable NOVA JARVIS.`,
      };
    }

    // 3. Check Sync Recency (SYNC_FAILING if no sync in > 48h)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const isSyncFailing = !device.lastSeenAt || device.lastSeenAt < fortyEightHoursAgo;

    // 4. Check Listener Activity / Connection (Device active within past 2 hours)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const isListenerConnected = device.lastSeenAt ? device.lastSeenAt > twoHoursAgo : false;

    // 5. Approved Packages Filter Check (from permission metadata or default set)
    const rawPackages = (notifPermission as any)?.metadata && typeof (notifPermission as any).metadata === 'object' && Array.isArray((notifPermission as any).metadata.approvedPackages)
      ? (notifPermission as any).metadata.approvedPackages
      : ['com.whatsapp', 'com.slack', 'com.google.android.gm', 'com.google.android.calendar', 'com.discord'];
    const approvedPackages: string[] = rawPackages.map((p: string) => p.toLowerCase());

    if (targetPackage && !approvedPackages.includes(targetPackage.toLowerCase())) {
      return {
        state: 'APP_NOT_APPROVED',
        hasPairedDevice: true,
        deviceName: device.deviceName,
        isPermissionGranted: true,
        isListenerConnected,
        approvedAppsCount: approvedPackages.length,
        approvedAppPackages: approvedPackages,
        lastSyncAt: device.lastSeenAt?.toISOString() || null,
        recentEventsCount: 0,
        recentEvents: [],
        aiDirective: `APP_NOT_APPROVED: The application "${targetPackage}" is not currently in the user's approved notification allowlist. Explain that notifications for this app are disabled in Notification Preferences.`,
      };
    }

    if (isSyncFailing) {
      return {
        state: 'SYNC_FAILING',
        hasPairedDevice: true,
        deviceName: device.deviceName,
        isPermissionGranted: true,
        isListenerConnected: false,
        approvedAppsCount: approvedPackages.length,
        approvedAppPackages: approvedPackages,
        lastSyncAt: device.lastSeenAt?.toISOString() || null,
        recentEventsCount: 0,
        recentEvents: [],
        aiDirective: `SYNC_FAILING: Android Notification Access is granted on ${device.deviceName}, but synchronization has been delayed for over 48 hours. Report that notification sync is delayed and suggest checking phone battery saver settings. Never claim lack of access for privacy reasons.`,
      };
    }

    // 6. Check Recent Ingested Events (past 24h)
    const recentEvents = await this.prisma.mobileEvent.findMany({
      where: {
        userId,
        deviceId: device.id,
        occurredAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        appName: true,
        sourceApp: true,
        category: true,
        title: true,
        summary: true,
        occurredAt: true,
      },
    });

    if (!isListenerConnected && recentEvents.length === 0) {
      return {
        state: 'LISTENER_DISCONNECTED',
        hasPairedDevice: true,
        deviceName: device.deviceName,
        isPermissionGranted: true,
        isListenerConnected: false,
        approvedAppsCount: approvedPackages.length,
        approvedAppPackages: approvedPackages,
        lastSyncAt: device.lastSeenAt?.toISOString() || null,
        recentEventsCount: 0,
        recentEvents: [],
        aiDirective: `LISTENER_DISCONNECTED: Notification Access is authorized on ${device.deviceName}, but the native listener service is currently disconnected or asleep. Advise the user to open the NOVA Companion app on their phone to re-establish the live connection.`,
      };
    }

    // Fully Connected State
    return {
      state: 'FULLY_CONNECTED',
      hasPairedDevice: true,
      deviceName: device.deviceName,
      isPermissionGranted: true,
      isListenerConnected: true,
      approvedAppsCount: approvedPackages.length,
      approvedAppPackages: approvedPackages,
      lastSyncAt: device.lastSeenAt?.toISOString() || null,
      recentEventsCount: recentEvents.length,
      recentEvents: recentEvents.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() })),
      aiDirective: `FULLY_CONNECTED: Real-time Android Notification Access is ACTIVE on ${device.deviceName}. There are ${recentEvents.length} recent permitted notification events. When answering, use the actual recentEvents records provided in context. Never claim lack of access for privacy reasons.`,
    };
  }
}
