import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from '../src/modules/mobile/mobile.service';
import { MobilePushService } from '../src/modules/mobile/mobile-push.service';
import { DigitalActionOrchestratorService } from '../src/modules/ai/digital-action-orchestrator.service';
import { UnifiedContextService } from '../src/modules/ai/unified-context.service';
import { PrismaService } from '../src/common/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('Security & Isolation Revalidation Suite (Task 4)', () => {
  let mobileService: MobileService;
  let orchestratorService: DigitalActionOrchestratorService;
  let contextService: UnifiedContextService;

  const mockPrisma = {
    mobileDevice: {
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
      updateMany: jest.fn(),
    },
    mobileEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    task: { findMany: jest.fn() },
    routine: { findMany: jest.fn() },
    project: { findMany: jest.fn() },
    knowledgeNote: { findMany: jest.fn() },
    $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
  };

  const mockPushService = {
    sendCommand: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        DigitalActionOrchestratorService,
        UnifiedContextService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MobilePushService, useValue: mockPushService },
      ],
    }).compile();

    mobileService = module.get<MobileService>(MobileService);
    orchestratorService = module.get<DigitalActionOrchestratorService>(DigitalActionOrchestratorService);
    contextService = module.get<UnifiedContextService>(UnifiedContextService);
  });

  describe('1. Cross-User Tenant Isolation & IDOR Protection', () => {
    it('strictly prevents User A from confirming or accessing User B device', async () => {
      // Device belongs to user-B, but request made by user-A
      mockPrisma.mobileDevice.findFirst.mockResolvedValue(null);

      await expect(
        mobileService.confirmPairing('user-A', {
          deviceId: 'dev-user-B',
          signedChallenge: 'sig-abc',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('enforces user scoping on unified context queries', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.routine.findMany.mockResolvedValue([]);
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.mobileDevice.findMany.mockResolvedValue([]);
      mockPrisma.mobileEvent.findMany.mockResolvedValue([]);
      mockPrisma.knowledgeNote.findMany.mockResolvedValue([]);

      const res = await contextService.assembleContext('tenant-xyz');
      expect(res.user.id).toBe('tenant-xyz');
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'tenant-xyz' }) }),
      );
    });
  });

  describe('2. Challenge Invalidation & Replay Resistance', () => {
    it('atomically invalidates challenge and rejects replay attempts', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-1',
        userId: 'user-1',
        pairingChallenge: null, // Already consumed
        challengeExpiry: null,
      });

      await expect(
        mobileService.confirmPairing('user-1', {
          deviceId: 'dev-1',
          signedChallenge: 'sig-replayed',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Autonomy Levels & L3 Approval Gating', () => {
    it('holds consequential payment, communication and deletion in AWAITING_APPROVAL', async () => {
      const commAction = await orchestratorService.processAction(
        'user-1',
        'COMMUNICATION',
        'SEND_COMMUNICATION',
        { to: '+1234567890', text: 'Sensitive message' },
      );
      expect(commAction.riskLevel).toBe('L3_APPROVAL_REQUIRED');
      expect(commAction.status).toBe('AWAITING_APPROVAL');

      const paymentAction = await orchestratorService.processAction(
        'user-1',
        'SYSTEM_CALENDAR',
        'EXECUTE_PAYMENT',
        { amount: 500 },
      );
      expect(paymentAction.riskLevel).toBe('L3_APPROVAL_REQUIRED');
      expect(paymentAction.status).toBe('AWAITING_APPROVAL');
    });

    it('blocks unapproved action execution at the service layer', async () => {
      const action = await orchestratorService.processAction(
        'user-1',
        'COMMUNICATION',
        'DELETE_RESOURCE',
        { resourceId: 'res-99' },
      );
      expect(action.status).toBe('AWAITING_APPROVAL');
      // Verify no device dispatch occurred
      expect(mockPushService.sendCommand).not.toHaveBeenCalled();
    });
  });

  describe('4. Device Revocation & Token Deactivation', () => {
    it('transactionally invalidates active sessions and push tokens on revocation', async () => {
      mockPrisma.mobileDevice.findFirst.mockResolvedValue({
        id: 'dev-1',
        userId: 'user-1',
      });

      const res = await mobileService.revokeDevice('user-1', 'dev-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.mobileDeviceSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deviceId: 'dev-1' }, data: { isActive: false } }),
      );
      expect(mockPrisma.mobilePushToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deviceId: 'dev-1' }, data: { isActive: false } }),
      );
    });
  });
});
