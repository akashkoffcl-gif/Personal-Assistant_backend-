import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from '../src/modules/mobile/mobile.service';
import { MobilePushService } from '../src/modules/mobile/mobile-push.service';
import { PrismaService } from '../src/common/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('MobileService (Phase 54 Device Intelligence)', () => {
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

  describe('Device Pairing Lifecycle (M54-01 to M54-03)', () => {
    it('initiates device pairing and returns cryptographic challenge', async () => {
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
      expect(res.challenge.length).toBe(64); // 32 hex bytes
      expect(res.expiresAt).toBeDefined();
    });

    it('rejects confirmation if device not found', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmPairing('user-1', {
          deviceId: 'invalid-dev',
          signedChallenge: 'sig-abc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('successfully confirms pairing when challenge signature matches', async () => {
      const challenge = 'aabbcc112233';
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        publicKey: 'MIIB...',
        pairingChallenge: challenge,
        challengeExpiry: new Date(Date.now() + 60000),
      });

      const res = await service.confirmPairing('user-1', {
        deviceId: 'dev-123',
        signedChallenge: `sig-${challenge}`,
      });

      expect(res.status).toBe('PAIRED');
      expect(res.sessionToken).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('Event Ingestion & Privacy (M54-04 to M54-07)', () => {
    it('ingests permitted event from paired device', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });

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

    it('blocks event ingestion from un-paired device', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.ingestEvent('user-1', {
          deviceId: 'unpaired-dev',
          sourceApp: 'com.whatsapp',
          category: 'COMMUNICATION',
          occurredAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Mobile Command Execution & Confirmation (M54-08 to M54-12)', () => {
    it('executes command without confirmation immediately', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });

      mockPrisma.mobileCommand.create.mockResolvedValue({
        id: 'cmd-1',
        commandType: 'OPEN_APP',
        status: 'SENT_TO_DEVICE',
        requiresConfirmation: false,
      });

      const cmd = await service.executeCommand('user-1', {
        deviceId: 'dev-123',
        commandType: 'OPEN_APP',
        payload: { packageName: 'com.spotify.music' },
        requiresConfirmation: false,
      });

      expect(cmd.id).toBe('cmd-1');
      expect(mockPushService.sendCommand).toHaveBeenCalled();
    });

    it('holds command in PENDING_CONFIRMATION if requiresConfirmation is true', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-123',
        userId: 'user-1',
        status: 'PAIRED',
      });

      mockPrisma.mobileCommand.create.mockResolvedValue({
        id: 'cmd-2',
        commandType: 'SEND_MESSAGE',
        status: 'PENDING_CONFIRMATION',
        requiresConfirmation: true,
      });

      const cmd = await service.executeCommand('user-1', {
        deviceId: 'dev-123',
        commandType: 'SEND_MESSAGE',
        payload: { text: 'Hello' },
        requiresConfirmation: true,
      });

      expect(cmd.status).toBe('PENDING_CONFIRMATION');
    });
  });
});

