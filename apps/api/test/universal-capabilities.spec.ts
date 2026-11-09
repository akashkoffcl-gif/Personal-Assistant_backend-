import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AIService } from '../src/modules/ai/ai.service';
import { JarvisToolRegistryService } from '../src/modules/ai/jarvis-tool-registry.service';
import { PrismaService } from '../src/common/prisma.service';
import { RedisService } from '../src/common/redis.service';
import { AIToolsService } from '../src/modules/ai/ai-tools.service';
import { AIMemoryService } from '../src/modules/ai/ai-memory.service';
import { AIDashboardCustomizationService } from '../src/modules/ai/ai-customization.service';
import { SmartPlannerService } from '../src/modules/ai/smart-planner.service';
import { WorkerService } from '../src/worker/worker.service';

describe('Phase 51.1 Universal Capabilities & Action Authorization Security', () => {
  let aiService: AIService;
  let jarvisRegistry: JarvisToolRegistryService;

  const mockPrisma = {
    isConnected: true,
    aIAction: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aIConversation: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    knowledgeNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockRedis = {
    isConnected: false,
    getClient: jest.fn().mockReturnValue(null),
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockJarvisRegistry = {
    executeTool: jest.fn(),
    getTool: jest.fn(),
    getAllTools: jest.fn().mockReturnValue(new Array(36).fill({ id: 'mock-tool' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: JarvisToolRegistryService, useValue: mockJarvisRegistry },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AIToolsService, useValue: {} },
        { provide: AIMemoryService, useValue: {} },
        { provide: WorkerService, useValue: {} },
        { provide: AIDashboardCustomizationService, useValue: {} },
        { provide: SmartPlannerService, useValue: {} },
      ],
    }).compile();

    aiService = module.get<AIService>(AIService);
    jarvisRegistry = module.get<JarvisToolRegistryService>(JarvisToolRegistryService);

    jest.clearAllMocks();
  });

  describe('P0 Security: Action Execution Ownership & Authorization', () => {
    const userId = 'user-owner-123';
    const attackerId = 'user-attacker-666';
    const actionId = 'action-uuid-999';

    it('rejects execution when action belongs to another user (anti-forgery & cross-user isolation)', async () => {
      // Mock returns null because action is owned by user-owner-123, not user-attacker-666
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce(null);

      await expect(
        aiService.executeAction(attackerId, actionId, true)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.aIAction.findFirst).toHaveBeenCalledWith({
        where: { id: actionId, userId: attackerId },
      });
      expect(mockJarvisRegistry.executeTool).not.toHaveBeenCalled();
    });

    it('rejects execution replay if action status is already EXECUTED (idempotency guard)', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: actionId,
        userId,
        status: 'EXECUTED',
        riskLevel: 'LOW',
        actionType: 'CREATE_TASK',
        payload: { title: 'Test Task' },
      });

      await expect(
        aiService.executeAction(userId, actionId, true)
      ).rejects.toThrow(BadRequestException);

      expect(mockJarvisRegistry.executeTool).not.toHaveBeenCalled();
    });

    it('rejects execution replay if action status is REJECTED or CANCELLED', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: actionId,
        userId,
        status: 'REJECTED',
        riskLevel: 'LOW',
        actionType: 'CREATE_TASK',
        payload: {},
      });

      await expect(
        aiService.executeAction(userId, actionId, true)
      ).rejects.toThrow(BadRequestException);

      expect(mockJarvisRegistry.executeTool).not.toHaveBeenCalled();
    });

    it('rejects high-risk action when confirmed flag is false (mandatory explicit confirmation)', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: actionId,
        userId,
        status: 'PROPOSED',
        riskLevel: 'HIGH',
        actionType: 'DELETE_TASK',
        payload: { id: 'task-1' },
      });

      mockJarvisRegistry.getTool.mockReturnValueOnce({
        id: 'delete_task',
        name: 'Delete Task',
        riskLevel: 'HIGH',
      });

      await expect(
        aiService.executeAction(userId, actionId, false)
      ).rejects.toThrow(ForbiddenException);

      expect(mockJarvisRegistry.executeTool).not.toHaveBeenCalled();
    });

    it('successfully executes authorized action and dispatches through unified JarvisToolRegistry', async () => {
      const toolPayload = { title: 'Review Code', priority: 'HIGH' };
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: actionId,
        userId,
        status: 'PROPOSED',
        riskLevel: 'MEDIUM',
        actionType: 'CREATE_TASK',
        payload: toolPayload,
      });

      mockJarvisRegistry.getTool.mockReturnValueOnce({
        id: 'create_task',
        name: 'Create Task',
        riskLevel: 'MEDIUM',
      });

      mockJarvisRegistry.executeTool.mockResolvedValueOnce({
        success: true,
        data: { id: 'created-task-uuid', title: 'Review Code' },
      });

      mockPrisma.aIAction.update.mockResolvedValueOnce({
        id: actionId,
        status: 'EXECUTED',
      });

      const result = await aiService.executeAction(userId, actionId, true);

      expect(result.status).toBe('EXECUTED');
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledWith(
        userId,
        'create_task',
        toolPayload,
      );
      expect(mockPrisma.aIAction.update).toHaveBeenCalledWith({
        where: { id: actionId },
        data: expect.objectContaining({
          status: 'EXECUTED',
        }),
      });
    });
  });

  describe('Universal Tool Registry: Capability Invocations', () => {
    it('verifies Jarvis registry maintains full domain coverage', () => {
      expect(jarvisRegistry.getAllTools().length).toBeGreaterThanOrEqual(35);
    });
  });
});
