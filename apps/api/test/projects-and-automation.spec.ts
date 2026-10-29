import { ProjectsService } from '../src/modules/projects/projects.service';
import { AutomationService } from '../src/modules/automation/automation.service';
import { TaskStatus } from '@assistant/shared';

describe('Projects and Automation Services', () => {
  let projectsService: ProjectsService;
  let automationService: AutomationService;

  const mockPrisma = {
    isConnected: true,
    project: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    automationRule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    automationRuleExecution: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedis = {
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
  };

  const mockOutbox = {
    publish: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
  };

  const mockNotifications = {
    notifyUser: jest.fn().mockResolvedValue({ deliveredCount: 1 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    projectsService = new ProjectsService(mockPrisma as any, mockRedis as any);
    automationService = new AutomationService(
      mockPrisma as any,
      mockOutbox as any,
      mockNotifications as any,
    );
  });

  describe('Projects Service', () => {
    it('computes progress percentage dynamically from underlying tasks', async () => {
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          userId: 'user-1',
          title: 'Q4 Product Launch',
          color: '#142B4A',
          status: 'ACTIVE',
          targetDate: new Date('2026-12-31T00:00:00Z'),
          createdAt: new Date('2026-10-01T00:00:00Z'),
          updatedAt: new Date('2026-10-29T00:00:00Z'),
          tasks: [
            { id: 't-1', status: TaskStatus.COMPLETED, deadline: null },
            { id: 't-2', status: TaskStatus.COMPLETED, deadline: null },
            { id: 't-3', status: TaskStatus.IN_PROGRESS, deadline: null },
            { id: 't-4', status: TaskStatus.TODO, deadline: null },
          ],
        },
      ]);

      const projects = await projectsService.getProjects('user-1');

      expect(projects).toHaveLength(1);
      expect(projects[0].tasksCount).toBe(4);
      expect(projects[0].completedTasksCount).toBe(2);
      expect(projects[0].progressPercent).toBe(50); // 2 of 4 = 50%
      expect(projects[0].status).toBe('ACTIVE');
    });

    it('unlinks tasks without deleting them when project is removed', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        userId: 'user-1',
        title: 'Deprecated Project',
      });
      mockPrisma.task.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.project.delete.mockResolvedValue({ id: 'proj-1' });

      const result = await projectsService.deleteProject('user-1', 'proj-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { projectId: 'proj-1', userId: 'user-1' },
        data: { projectId: null },
      });
      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
      });
    });
  });

  describe('Automation Rules Engine', () => {
    it('seeds default enterprise rules when none exist for user', async () => {
      mockPrisma.automationRule.findMany
        .mockResolvedValueOnce([]) // First check returns empty
        .mockResolvedValueOnce([
          {
            id: 'rule-1',
            userId: 'user-1',
            name: 'Overdue Task Warning',
            ruleType: 'OVERDUE_ALERT',
            condition: {},
            action: {},
            cooldownMinutes: 120,
            lastExecutedAt: null,
            isEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      mockPrisma.automationRule.create.mockResolvedValue({});

      const rules = await automationService.getRules('user-1');

      expect(rules).toHaveLength(1);
      expect(mockPrisma.automationRule.create).toHaveBeenCalledTimes(4); // 4 default enterprise rules seeded
    });

    it('evaluates rules and respects cooldown to prevent execution loops', async () => {
      const now = new Date();
      const recentExecution = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

      mockPrisma.automationRule.findMany.mockResolvedValue([
        {
          id: 'rule-cooldown',
          userId: 'user-1',
          name: 'Overdue Alert',
          ruleType: 'OVERDUE_ALERT',
          cooldownMinutes: 60, // 60m cooldown
          lastExecutedAt: recentExecution, // 10m ago -> Cooldown ACTIVE
          isEnabled: true,
        },
      ]);

      const result = await automationService.evaluateRules('user-1');

      expect(result.evaluated).toBe(1);
      expect(result.executed).toBe(0); // Did not execute due to cooldown
      expect(mockPrisma.automationRuleExecution.create).not.toHaveBeenCalled();
    });

    it('executes rule and logs execution record when conditions are met and cooldown expired', async () => {
      const pastExecution = new Date(Date.now() - 180 * 60 * 1000); // 3 hours ago

      mockPrisma.automationRule.findMany.mockResolvedValue([
        {
          id: 'rule-active',
          userId: 'user-1',
          name: 'Overdue Alert',
          ruleType: 'OVERDUE_ALERT',
          cooldownMinutes: 60,
          lastExecutedAt: pastExecution, // Expired cooldown
          isEnabled: true,
        },
      ]);

      mockPrisma.task.findMany.mockResolvedValue([
        { id: 't-overdue-1', title: 'Submit RFP', status: TaskStatus.TODO },
      ]);

      mockPrisma.automationRuleExecution.create.mockResolvedValue({});
      mockPrisma.automationRule.update.mockResolvedValue({});

      const result = await automationService.evaluateRules('user-1');

      expect(result.executed).toBe(1);
      expect(mockPrisma.automationRuleExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ruleId: 'rule-active',
          userId: 'user-1',
          actionTaken: expect.stringContaining('Alerted user on 1 overdue task(s)'),
          status: 'SUCCESS',
        }),
      });
      expect(mockPrisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-active' },
        data: expect.objectContaining({ lastExecutedAt: expect.any(Date) }),
      });
    });
  });
});

