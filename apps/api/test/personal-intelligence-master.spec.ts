import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedContextService } from '../src/modules/ai/unified-context.service';
import { ReasoningEngineService } from '../src/modules/ai/reasoning-engine.service';
import { DigitalActionOrchestratorService } from '../src/modules/ai/digital-action-orchestrator.service';
import { AdaptivePersonalizationService } from '../src/modules/ai/adaptive-personalization.service';
import { PrismaService } from '../src/common/prisma.service';
import { JarvisToolRegistryService } from '../src/modules/ai/jarvis-tool-registry.service';
import { MobileService } from '../src/modules/mobile/mobile.service';

describe('Phase 55 - 60 Comprehensive Personal Intelligence & Jarvis Architecture', () => {
  let contextService: UnifiedContextService;
  let reasoningService: ReasoningEngineService;
  let orchestratorService: DigitalActionOrchestratorService;
  let personalizationService: AdaptivePersonalizationService;

  const mockPrisma = {
    task: { findMany: jest.fn().mockResolvedValue([{ id: 't1', title: 'Review PR', priority: 'HIGH', status: 'TODO', deadline: null }]) },
    routine: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', title: 'Morning Workout', targetTime: '07:30' }]) },
    project: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', title: 'NOVA Companion', color: '#8B5CF6' }]) },
    mobileDevice: { findMany: jest.fn().mockResolvedValue([{ id: 'd1', deviceName: 'Pixel 9 Pro' }]) },
    mobileEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'e1', sourceApp: 'com.slack', appName: 'Slack', category: 'COMMUNICATION', title: 'Standup', summary: 'Starting now', occurredAt: new Date() }]) },
    knowledgeNote: { findMany: jest.fn().mockResolvedValue([{ title: '[JARVIS_MEMORY] Morning Routine', content: JSON.stringify({ category: 'PREFERENCE', key: 'Morning Routine', value: 'Prefers 7:30 AM workouts', source: 'USER_EXPLICIT' }) }]) },
    userSettings: { findUnique: jest.fn().mockResolvedValue({ workStartHour: 9, workEndHour: 18 }) },
  };

  const mockToolRegistry = {};
  const mockMobileService = {
    executeCommand: jest.fn().mockResolvedValue({ id: 'cmd-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedContextService,
        ReasoningEngineService,
        DigitalActionOrchestratorService,
        AdaptivePersonalizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JarvisToolRegistryService, useValue: mockToolRegistry },
        { provide: MobileService, useValue: mockMobileService },
      ],
    }).compile();

    contextService = module.get<UnifiedContextService>(UnifiedContextService);
    reasoningService = module.get<ReasoningEngineService>(ReasoningEngineService);
    orchestratorService = module.get<DigitalActionOrchestratorService>(DigitalActionOrchestratorService);
    personalizationService = module.get<AdaptivePersonalizationService>(AdaptivePersonalizationService);
  });

  describe('Phase 55: Unified Personal Intelligence Engine', () => {
    it('assembles multi-source bounded context snapshot with user isolation', async () => {
      const snapshot = await contextService.assembleContext('user-1');
      expect(snapshot.user.id).toBe('user-1');
      expect(snapshot.operational.topTasks.length).toBe(1);
      expect(snapshot.mobileIntelligence.recentEvents.length).toBe(1);
      expect(snapshot.memories.length).toBe(1);
      expect(snapshot.summaryPrompt).toContain('UNIFIED PERSONAL CONTEXT');
      expect(snapshot.summaryPrompt).toContain('Morning Workout');
    });
  });

  describe('Phase 56: Independent Reasoning & Structured Decision Support', () => {
    it('decomposes complex goal into milestones with risk boundaries', async () => {
      const plan = await reasoningService.formulatePlan('Launch product in 30 days');
      expect(plan.decomposedMilestones.length).toBeGreaterThan(2);
      expect(plan.steps.length).toBe(plan.decomposedMilestones.length);
      expect(plan.steps[plan.steps.length - 1].requiresConfirmation).toBe(true);
      expect(plan.recommendedAction).toBeDefined();
    });
  });

  describe('Phase 58: Universal Digital Interaction & Action State Machine', () => {
    it('enforces L3 approval gate for consequential communication actions', async () => {
      const action = await orchestratorService.processAction(
        'user-1',
        'COMMUNICATION',
        'SEND_COMMUNICATION',
        { recipient: 'lead@corp.com', text: 'Confirmed proposal' },
      );
      expect(action.riskLevel).toBe('L3_APPROVAL_REQUIRED');
      expect(action.status).toBe('AWAITING_APPROVAL');
      expect(mockMobileService.executeCommand).not.toHaveBeenCalled();
    });

    it('executes permitted L2 mobile actions directly', async () => {
      const action = await orchestratorService.processAction(
        'user-1',
        'ANDROID_INTENT',
        'OPEN_APP',
        { packageName: 'com.spotify.music' },
        'device-123',
      );
      expect(action.riskLevel).toBe('L2_PERMITTED');
      expect(action.status).toBe('SUCCEEDED');
      expect(mockMobileService.executeCommand).toHaveBeenCalled();
    });
  });

  describe('Phase 59: Adaptive Personalization & Behavioral Profile', () => {
    it('retrieves user personalization profile with observed working patterns', async () => {
      const profile = await personalizationService.getProfile('user-1');
      expect(profile.userId).toBe('user-1');
      expect(profile.communicationStyle).toBe('CONCISE');
      expect(profile.activeWorkingHours.startHour).toBe(9);
      expect(profile.observedPatterns.length).toBeGreaterThan(0);
    });
  });
});

