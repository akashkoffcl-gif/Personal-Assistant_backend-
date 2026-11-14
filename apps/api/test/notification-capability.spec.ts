import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCapabilityService } from '../src/modules/mobile/notification-capability.service';
import { PrismaService } from '../src/common/prisma.service';

describe('NotificationCapabilityService', () => {
  let service: NotificationCapabilityService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      mobileDevice: {
        findFirst: jest.fn(),
      },
      mobileEvent: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCapabilityService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<NotificationCapabilityService>(NotificationCapabilityService);
  });

  it('should return NO_DEVICE_PAIRED when user has no active paired mobile devices', async () => {
    prisma.mobileDevice.findFirst.mockResolvedValue(null);

    const result = await service.getCapabilityStatus('user-test-1');

    expect(result.state).toBe('NO_DEVICE_PAIRED');
    expect(result.hasPairedDevice).toBe(false);
    expect(result.aiDirective).toContain('NO_DEVICE_PAIRED');
  });

  it('should return PERMISSION_NOT_GRANTED when device exists but NOTIFICATION_LISTENER is denied', async () => {
    prisma.mobileDevice.findFirst.mockResolvedValue({
      id: 'device-1',
      deviceName: 'Pixel 8 Pro',
      lastSeenAt: new Date(),
      permissions: [
        { permissionKey: 'NOTIFICATION_LISTENER', isGranted: false },
      ],
    });

    const result = await service.getCapabilityStatus('user-test-1');

    expect(result.state).toBe('PERMISSION_NOT_GRANTED');
    expect(result.hasPairedDevice).toBe(true);
    expect(result.isPermissionGranted).toBe(false);
    expect(result.aiDirective).toContain('PERMISSION_NOT_GRANTED');
  });

  it('should return SYNC_FAILING when device has not synchronized in over 48 hours', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    prisma.mobileDevice.findFirst.mockResolvedValue({
      id: 'device-1',
      deviceName: 'Pixel 8 Pro',
      lastSeenAt: threeDaysAgo,
      permissions: [
        { permissionKey: 'NOTIFICATION_LISTENER', isGranted: true },
      ],
    });
    prisma.mobileEvent.findMany.mockResolvedValue([]);

    const result = await service.getCapabilityStatus('user-test-1');

    expect(result.state).toBe('SYNC_FAILING');
    expect(result.isPermissionGranted).toBe(true);
    expect(result.aiDirective).toContain('SYNC_FAILING');
  });

  it('should return APP_NOT_APPROVED when targetPackage is not in approved list', async () => {
    prisma.mobileDevice.findFirst.mockResolvedValue({
      id: 'device-1',
      deviceName: 'Pixel 8 Pro',
      lastSeenAt: new Date(),
      permissions: [
        {
          permissionKey: 'NOTIFICATION_LISTENER',
          isGranted: true,
          metadata: { approvedPackages: ['com.whatsapp'] },
        },
      ],
    });
    prisma.mobileEvent.findMany.mockResolvedValue([]);

    const result = await service.getCapabilityStatus('user-test-1', 'com.slack');

    expect(result.state).toBe('APP_NOT_APPROVED');
    expect(result.aiDirective).toContain('APP_NOT_APPROVED');
    expect(result.aiDirective).toContain('com.slack');
  });

  it('should return FULLY_CONNECTED with recent notification events when active and synced', async () => {
    const mockEvents = [
      {
        id: 'evt-1',
        appName: 'WhatsApp',
        sourceApp: 'com.whatsapp',
        category: 'MESSAGING',
        title: 'Alice',
        summary: 'Hey, are we still meeting today?',
        occurredAt: new Date(),
      },
    ];

    prisma.mobileDevice.findFirst.mockResolvedValue({
      id: 'device-1',
      deviceName: 'Pixel 8 Pro',
      lastSeenAt: new Date(),
      permissions: [
        {
          permissionKey: 'NOTIFICATION_LISTENER',
          isGranted: true,
          metadata: { approvedPackages: ['com.whatsapp'] },
        },
      ],
    });
    prisma.mobileEvent.findMany.mockResolvedValue(mockEvents);

    const result = await service.getCapabilityStatus('user-test-1');

    expect(result.state).toBe('FULLY_CONNECTED');
    expect(result.isPermissionGranted).toBe(true);
    expect(result.isListenerConnected).toBe(true);
    expect(result.recentEventsCount).toBe(1);
    expect(result.recentEvents[0].appName).toBe('WhatsApp');
    expect(result.aiDirective).toContain('FULLY_CONNECTED');
  });
});
