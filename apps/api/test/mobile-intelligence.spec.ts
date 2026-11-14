import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from '../src/modules/mobile/mobile.service';
import { MobilePushService } from '../src/modules/mobile/mobile-push.service';
import { PrismaService } from '../src/common/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('MobileService (Phase 54 & 54.1 Device Intelligence & Real-Device Readiness)', () => {
  let service: MobileService;
  let pushService: MobilePushService;
  let prisma: any;

  const mockPrisma = {
    mobileDevice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    mobileDeviceSession: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    mobilePushToken: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    mobilePermission: {
      upsert: jest.fn(),
    },
    mobileEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    mobileCommand: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
  };

  const mockPushService = {
    registerToken: jest.fn().mockResolvedValue({ id: 'token-1' }),
    sendToDevice: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
    sendCommand: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MobilePushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
    pushService = module.get<MobilePushService>(MobilePushService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Device Pairing Lifecycle & Cryptography (M54.1-03 to M54.1-07)', () => {
    it('M54.1-04/05: initiates device pairing and returns cryptographic challenge', async () => {
      mockPrisma.mobileDevice.create.mockResolvedValue({
        id: 'dev-123',
        deviceName: 'Pixel 9 Pro',
        status: 'PENDING_PAIRING',
      });

      const res = await service.initiatePairing('user-1', {
        deviceName: 'Pixel 9 Pro',
        deviceModel: 'Google Pixel 9 Pro',
        osVersion: '15.0',
        appVersion: '1.0.0',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----',
      });

      expect(res.deviceId).toBe('dev-123');
      expect(res.challenge).toBeDefined();
      expect(res.challenge.length).toBe(64);
      expect(res.expiresAt).toBeDefined();
    });

    it('M54.1-06: rejects invalid device signature on confirmation', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        publicKey: 'invalid-key',
        pairingChallenge: 'valid-challenge',
        challengeExpiry: new Date(Date.now() + 60000),
      });
      mockPrisma.mobileDevice.update.mockResolvedValue({});

      await expect(
        service.confirmPairing('user-1', {
          deviceId: 'dev-123',
          signedChallenge: 'wrong-signature',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('M54.1-07: rejects challenge replay after it has been consumed', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        publicKey: 'valid-key',
        pairingChallenge: null, // Challenge already consumed
        challengeExpiry: null,
      });

      await expect(
        service.confirmPairing('user-1', {
          deviceId: 'dev-123',
          signedChallenge: 'sig-abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('M54.1-05: successfully confirms pairing when challenge signature matches', async () => {
      const challenge = 'aabbcc112233';
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        publicKey: 'MIIB...',
        pairingChallenge: challenge,
        challengeExpiry: new Date(Date.now() + 60000),
      });
      mockPrisma.mobileDevice.update.mockResolvedValue({});

      const res = await service.confirmPairing('user-1', {
        deviceId: 'dev-123',
        signedChallenge: `sig-${challenge}`,
      });

      expect(res.status).toBe('PAIRED');
      expect(res.sessionToken).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Push Token Registration & Lifecycle (M54.1-08 to M54.1-10)', () => {
    it('M54.1-09/10: registers and rotates FCM push token for paired device', async () => {
      const res = await service.registerPushToken('user-1', {
        deviceId: 'dev-123',
        fcmToken: 'fcm-fresh-token-abc',
      });

      expect(mockPushService.registerToken).toHaveBeenCalledWith(
        'user-1',
        'dev-123',
        'fcm-fresh-token-abc',
      );
      expect(res).toEqual({ id: 'token-1' });
    });
  });

  describe('Event Ingestion, Privacy & Deduplication (M54.1-13 to M54.1-15)', () => {
    it('M54.1-13: ingests permitted event from paired device', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });
      mockPrisma.mobileEvent.findFirst.mockResolvedValue(null);
      mockPrisma.mobileEvent.create.mockResolvedValue({
        id: 'evt-1',
        sourceApp: 'com.slack',
        title: 'Standup in 5 mins',
      });
      mockPrisma.mobileDevice.update.mockResolvedValue({});

      const evt = await service.ingestEvent('user-1', {
        deviceId: 'dev-123',
        sourceApp: 'com.slack',
        appName: 'Slack',
        category: 'COMMUNICATION',
        title: 'Standup in 5 mins',
        summary: 'Meeting starting now',
        occurredAt: new Date().toISOString(),
      });

      expect(evt.id).toBe('evt-1');
      expect(mockPrisma.mobileDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dev-123' } }),
      );
    });

    it('M54.1-14: sanitizes long strings and ensures field safety', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });
      mockPrisma.mobileEvent.findFirst.mockResolvedValue(null);
      mockPrisma.mobileEvent.create.mockImplementation(({ data }) => Promise.resolve({ id: 'evt-2', ...data }));
      mockPrisma.mobileDevice.update.mockResolvedValue({});

      const longTitle = 'A'.repeat(500);
      const longSummary = 'B'.repeat(2000);

      const evt = await service.ingestEvent('user-1', {
        deviceId: 'dev-123',
        sourceApp: 'com.whatsapp',
        category: 'COMMUNICATION',
        title: longTitle,
        summary: longSummary,
        occurredAt: new Date().toISOString(),
      });

      expect(evt.title.length).toBe(255);
      expect(evt.summary.length).toBe(1000);
    });

    it('M54.1-15: suppresses duplicate notification arriving within 60 seconds', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });
      mockPrisma.mobileEvent.findFirst.mockResolvedValue({
        id: 'existing-evt-id',
        title: 'New message',
      });

      const evt = await service.ingestEvent('user-1', {
        deviceId: 'dev-123',
        sourceApp: 'com.slack',
        category: 'COMMUNICATION',
        title: 'New message',
        occurredAt: new Date().toISOString(),
      });

      expect(evt.id).toBe('existing-evt-id');
      expect(mockPrisma.mobileEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('Command Authorization & Device Revocation (M54.1-17 to M54.1-18)', () => {
    it('M54.1-17: holds high-risk command in PENDING_CONFIRMATION', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });
      mockPrisma.mobileCommand.create.mockResolvedValue({
        id: 'cmd-high-risk',
        commandType: 'SEND_SMS',
        status: 'PENDING_CONFIRMATION',
        requiresConfirmation: true,
      });

      const cmd = await service.executeCommand('user-1', {
        deviceId: 'dev-123',
        commandType: 'SEND_SMS',
        payload: { recipient: '+1234567890', text: 'Confirmed' },
        requiresConfirmation: true,
      });

      expect(cmd.status).toBe('PENDING_CONFIRMATION');
      expect(mockPushService.sendCommand).not.toHaveBeenCalled();
    });

    it('M54.1-18: revokes device and revokes active sessions and push tokens', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
      });

      const res = await service.revokeDevice('user-1', 'dev-123');

      expect(res.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
