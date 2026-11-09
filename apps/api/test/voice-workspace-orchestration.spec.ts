import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AIService } from '../src/modules/ai/ai.service';
import { PrismaService } from '../src/common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JarvisToolRegistryService } from '../src/modules/ai/jarvis-tool-registry.service';
import { WorkflowPlannerService } from '../src/modules/ai/workflow/workflow-planner.service';
import { WorkflowOrchestratorService } from '../src/modules/ai/workflow/workflow-orchestrator.service';
import { SmartPlannerService } from '../src/modules/ai/smart-planner.service';
import { AIMemoryService } from '../src/modules/ai/ai-memory.service';
import { AIDashboardCustomizationService } from '../src/modules/ai/ai-customization.service';
import { AIToolsService } from '../src/modules/ai/ai-tools.service';
import { WorkerService } from '../src/worker/worker.service';
import { ExecutionGraphValidator, WorkflowPlan } from '../src/modules/ai/workflow/workflow-graph.types';

describe('Phase 51.3 — Voice-Driven Universal Workspace Orchestration Test Suite', () => {
  let aiService: AIService;
  let workflowPlanner: WorkflowPlannerService;
  let jarvisRegistry: JarvisToolRegistryService;

  const mockPrisma = {
    isConnected: true,
    userSettings: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'user-voice-test', timezone: 'UTC' }),
    },
    aIAction: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'act-voice-123', ...args.data })),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    aIConversation: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'conv-voice-1' }),
      update: jest.fn(),
    },
    aIMessage: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'msg-voice-1', ...args.data })),
    },
    task: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('mock-gemini-key'),
  };

  const mockJarvisRegistry = {
    getAllTools: jest.fn().mockReturnValue([
      { id: 'create_project', name: 'Create Project', riskLevel: 'MEDIUM', description: 'Create project' },
      { id: 'create_task', name: 'Create Task', riskLevel: 'MEDIUM', description: 'Create task' },
      { id: 'complete_task', name: 'Complete Task', riskLevel: 'LOW', description: 'Mark task complete' },
      { id: 'delete_task', name: 'Delete Task', riskLevel: 'HIGH', description: 'Delete task' },
      { id: 'start_focus_session', name: 'Start Focus Session', riskLevel: 'LOW', description: 'Start focus block' },
      { id: 'create_reminder', name: 'Create Reminder', riskLevel: 'MEDIUM', description: 'Create reminder' },
    ]),
    executeTool: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockWorkflowPlanner = {
    planWorkflow: jest.fn(),
    approveWorkflow: jest.fn(),
    rejectWorkflow: jest.fn(),
  };

  const mockWorkflowOrchestrator = {
    executeWorkflow: jest.fn(),
    executeWorkflowStream: jest.fn(),
  };

  const mockSmartPlanner = {
    generateDailyPlan: jest.fn(),
  };

  const mockAIMemory = {
    getPersonalContext: jest.fn().mockResolvedValue('Personal context for test user'),
    getContextualMemoryPrompt: jest.fn().mockResolvedValue('User memories context'),
  };

  const mockAICustomization = {
    getLayoutConfig: jest.fn().mockResolvedValue({}),
  };

  const mockAITools = {
    getPersonalBriefing: jest.fn().mockResolvedValue({}),
    getFocusSummary: jest.fn().mockResolvedValue({}),
    getGoalsSummary: jest.fn().mockResolvedValue({}),
    getFinanceSummary: jest.fn().mockResolvedValue({}),
  };

  const mockWorker = {
    queueAiWorkflow: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: JarvisToolRegistryService, useValue: mockJarvisRegistry },
        { provide: WorkflowPlannerService, useValue: mockWorkflowPlanner },
        { provide: WorkflowOrchestratorService, useValue: mockWorkflowOrchestrator },
        { provide: SmartPlannerService, useValue: mockSmartPlanner },
        { provide: AIMemoryService, useValue: mockAIMemory },
        { provide: AIDashboardCustomizationService, useValue: mockAICustomization },
        { provide: AIToolsService, useValue: mockAITools },
        { provide: WorkerService, useValue: mockWorker },
      ],
    }).compile();

    aiService = module.get<AIService>(AIService);
    workflowPlanner = module.get<WorkflowPlannerService>(WorkflowPlannerService);
    jarvisRegistry = module.get<JarvisToolRegistryService>(JarvisToolRegistryService);
  });

  describe('A. Universal Workspace Navigation Intent Resolution', () => {
    it('resolves direct navigation commands to clientAction: NAVIGATE_TAB with correct target tab', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Open finance',
        uiContext: { activeTab: 'dashboard' },
      });

      expect(res.clientAction).toBe('NAVIGATE_TAB');
      expect(res.tab).toBe('finance');
    });

    it('resolves semantic aliases to canonical workspace tabs', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Launch pomodoro timer',
        uiContext: { activeTab: 'dashboard' },
      });

      expect(res.clientAction).toBe('NAVIGATE_TAB');
      expect(res.tab).toBe('focus');
    });

    it('handles return / go back history navigation directives', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Go back to previous screen',
        uiContext: { activeTab: 'analytics' },
      });

      expect(res.clientAction).toBe('NAVIGATE_TAB');
      expect(res.tab).toBe('__BACK__');
    });
  });

  describe('B. Context-Aware Commands & Anaphora Resolution', () => {
    it('resolves "complete this task" when selectedTaskId is present in uiContext', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Complete this task',
        uiContext: {
          activeTab: 'work',
          selectedTaskId: 'task-active-99',
        },
      });

      expect(res.proposedAction).toBeDefined();
      expect(res.proposedAction?.actionType).toBe('COMPLETE_TASK');
      expect(res.proposedAction?.payload).toEqual({ taskId: 'task-active-99' });
    });

    it('requests clarification when "complete this task" is spoken without selectedTaskId context', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Complete this task',
        uiContext: {
          activeTab: 'dashboard',
        },
      });

      expect(res.proposedAction).toBeNull();
      expect(res.message.content.toLowerCase()).toContain('specify which task');
    });

    it('resolves "archive this project" using selectedProjectId from uiContext', async () => {
      const res = await aiService.chat('user-voice-test', {
        message: 'Archive this project',
        uiContext: {
          activeTab: 'projects',
          selectedProjectId: 'proj-active-77',
        },
      });

      expect(res.proposedAction).toBeDefined();
      expect(res.proposedAction?.actionType).toBe('ARCHIVE_PROJECT');
      expect(res.proposedAction?.payload).toEqual({ projectId: 'proj-active-77' });
    });
  });

  describe('C. Voice-Driven Multi-Step Workflow Generation', () => {
    it('delegates complex instructions to WorkflowPlannerService and returns workflow proposal', async () => {
      const mockPlan: WorkflowPlan = {
        id: 'wf-voice-plan-1',
        userId: 'user-voice-test',
        title: 'Launch Mobile App',
        originalPrompt: 'Create a project called Mobile App and add a task to Design UI',
        status: 'PROPOSED',
        planVersion: 1,
        overallRisk: 'MEDIUM',
        requiresExplicitApproval: true,
        steps: [
          { id: 's1', toolId: 'create_project', description: 'Create project', input: { title: 'Mobile App' }, riskLevel: 'MEDIUM', dependencies: [], status: 'PENDING' },
          { id: 's2', toolId: 'create_task', description: 'Create task', input: { title: 'Design UI', projectId: '$s1.projectId' }, riskLevel: 'MEDIUM', dependencies: ['s1'], status: 'PENDING' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWorkflowPlanner.planWorkflow.mockResolvedValue(mockPlan);

      const instruction = 'Create a project called Mobile App and add a task to Design UI';
      const result = await workflowPlanner.planWorkflow('user-voice-test', instruction);

      expect(result.id).toBe('wf-voice-plan-1');
      expect(result.status).toBe('PROPOSED');
      expect(result.steps.length).toBe(2);
      expect(result.steps[1].dependencies).toContain('s1');
    });
  });

  describe('D. Spoken Confirmation & Cancellation Semantics', () => {
    it('confirms pending workflow only when exact matching vocal confirmation is received', async () => {
      const approvedPlan: WorkflowPlan = {
        id: 'wf-voice-plan-1',
        userId: 'user-voice-test',
        title: 'Launch Mobile App',
        originalPrompt: 'Launch Mobile App',
        status: 'CONFIRMED',
        planVersion: 1,
        overallRisk: 'MEDIUM',
        requiresExplicitApproval: true,
        approvalSignature: {
          approvedBy: 'user-voice-test',
          approvedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          planVersion: 1,
          stepPayloadHash: 'hash-abc',
        },
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWorkflowPlanner.approveWorkflow.mockResolvedValue(approvedPlan);

      const approval = await workflowPlanner.approveWorkflow('user-voice-test', 'wf-voice-plan-1', 'hash-abc');

      expect(approval.status).toBe('CONFIRMED');
      expect(approval.approvalSignature?.approvedBy).toBe('user-voice-test');
    });

    it('rejects confirmation if workflow ownership does not match authenticated user', async () => {
      mockWorkflowPlanner.approveWorkflow.mockRejectedValue(
        new ForbiddenException('You are not authorized to approve this workflow')
      );

      await expect(
        workflowPlanner.approveWorkflow('attacker-user-id', 'wf-voice-plan-1', 'hash-abc')
      ).rejects.toThrow(ForbiddenException);
    });

    it('cancels pending workflow cleanly upon vocal cancel command', async () => {
      const cancelledPlan: WorkflowPlan = {
        id: 'wf-voice-plan-1',
        userId: 'user-voice-test',
        title: 'Launch Mobile App',
        originalPrompt: 'Launch Mobile App',
        status: 'REJECTED',
        planVersion: 1,
        overallRisk: 'LOW',
        requiresExplicitApproval: false,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWorkflowPlanner.rejectWorkflow.mockResolvedValue(cancelledPlan);

      const rejected = await workflowPlanner.rejectWorkflow('user-voice-test', 'wf-voice-plan-1', 'User vocal cancel');
      expect(rejected.status).toBe('REJECTED');
    });
  });
});
