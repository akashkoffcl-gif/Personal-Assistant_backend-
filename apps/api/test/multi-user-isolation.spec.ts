import { SupabaseAuthGuard } from '../src/modules/auth/supabase-auth.guard';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { ExecutionContext, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TaskCategory, Priority, SchedulingMode, TaskStatus } from '@assistant/shared';

describe('Phase 15: Multi-User Cross-Tenant Isolation & Security Suite', () => {
  const jwtSecret = 'test-secret-key-phase15-isolation-token-32-chars';
  const userAliceId = 'user-alice-1111-2222-3333';
  const userBobId = 'user-bob-4444-5555-6666';

  let authGuard: SupabaseAuthGuard;
  let tasksService: TasksService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockRemindersService: any;
  let mockOutboxService: any;
  let tokenAlice: string;
  let tokenBob: string;

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = jwtSecret;
    process.env.NODE_ENV = 'production';

    tokenAlice = jwt.sign(
      { sub: userAliceId, email: 'alice@enterprise.com', aud: 'authenticated', iss: 'supabase' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    tokenBob = jwt.sign(
      { sub: userBobId, email: 'bob@enterprise.com', aud: 'authenticated', iss: 'supabase' },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    mockPrisma = {
      isConnected: true,
      user: {
        upsert: jest.fn().mockResolvedValue({ id: 'any' }),
      },
      task: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
      },
      routine: {
        findFirst: jest.fn(),
      },
      taskEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue({
        publish: jest.fn(),
      }),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };

    mockRemindersService = {
      scheduleTaskReminders: jest.fn(),
      invalidateTaskReminders: jest.fn(),
    };

    mockOutboxService = {
      createEvent: jest.fn(),
    };

    authGuard = new SupabaseAuthGuard(mockPrisma);
    tasksService = new TasksService(mockPrisma, mockRedis, mockRemindersService, mockOutboxService);
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe('1. Supabase Auth Guard Cryptographic & Tenant Identity Verification', () => {
    it('authenticates User Alice and assigns scoped user context', async () => {
      const ctx = createMockContext({ authorization: `Bearer ${tokenAlice}` });
      const canActivate = await authGuard.canActivate(ctx);
      expect(canActivate).toBe(true);

      const req = ctx.switchToHttp().getRequest();
      expect(req.user.id).toBe(userAliceId);
      expect(req.user.email).toBe('alice@enterprise.com');
    });

    it('authenticates User Bob and assigns isolated user context', async () => {
      const ctx = createMockContext({ authorization: `Bearer ${tokenBob}` });
      const canActivate = await authGuard.canActivate(ctx);
      expect(canActivate).toBe(true);

      const req = ctx.switchToHttp().getRequest();
      expect(req.user.id).toBe(userBobId);
      expect(req.user.email).toBe('bob@enterprise.com');
    });

    it('rejects unauthenticated requests in production', async () => {
      const ctx = createMockContext({});
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects tokens signed with invalid/forged key', async () => {
      const forgedToken = jwt.sign(
        { sub: userAliceId, email: 'alice@enterprise.com', aud: 'authenticated' },
        'wrong-secret-key-that-does-not-match',
        { algorithm: 'HS256' },
      );
      const ctx = createMockContext({ authorization: `Bearer ${forgedToken}` });
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects tokens with invalid audience claim', async () => {
      const wrongAudToken = jwt.sign(
        { sub: userAliceId, email: 'alice@enterprise.com', aud: 'wrong_aud', iss: 'supabase' },
        jwtSecret,
        { algorithm: 'HS256' },
      );
      const ctx = createMockContext({ authorization: `Bearer ${wrongAudToken}` });
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects expired tokens', async () => {
      const expiredToken = jwt.sign(
        { sub: userAliceId, email: 'alice@enterprise.com', aud: 'authenticated', iss: 'supabase' },
        jwtSecret,
        { algorithm: 'HS256', expiresIn: '-10s' },
      );
      const ctx = createMockContext({ authorization: `Bearer ${expiredToken}` });
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('2. User-Scoped Data Isolation in TasksService', () => {
    it('scopes findAll queries strictly to the authenticated userId', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await tasksService.findAll(userAliceId);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: userAliceId }),
        }),
      );

      await tasksService.findAll(userBobId);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: userBobId }),
        }),
      );
    });

    it('prevents User Bob from viewing User Alice\'s task (returns 404)', async () => {
      // Database has Alice's task, but filter by Bob's userId returns null
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(tasksService.findOne(userBobId, 'alice-task-999')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alice-task-999', userId: userBobId },
        }),
      );
    });

    it('prevents User Bob from updating User Alice\'s task (returns 404)', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        tasksService.update(userBobId, 'alice-task-999', { title: 'Hacked by Bob' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('prevents User Bob from deleting User Alice\'s task (returns 404)', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(tasksService.remove(userBobId, 'alice-task-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. Parent-Child Cross-Tenant Boundary Enforcement', () => {
    it('blocks User Bob from associating a task with User Alice\'s project (throws 403)', async () => {
      // Bob tries to set projectId: 'alice-proj-100', but project lookup with Bob's userId returns null
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        tasksService.create(userBobId, {
          title: 'Illicit subtask',
          category: TaskCategory.WORK,
          priority: Priority.HIGH,
          schedulingMode: SchedulingMode.FLEXIBLE,
          projectId: 'alice-proj-100',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: 'alice-proj-100', userId: userBobId },
      });
    });

    it('blocks User Bob from attaching a subtask to User Alice\'s parent task (throws 403)', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null); // Parent not found under Bob's ownership

      await expect(
        tasksService.create(userBobId, {
          title: 'Illicit subtask',
          category: TaskCategory.WORK,
          priority: Priority.MEDIUM,
          schedulingMode: SchedulingMode.FLEXIBLE,
          parentTaskId: 'alice-parent-task-555',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'alice-parent-task-555', userId: userBobId },
      });
    });

    it('blocks User Bob from linking User Alice\'s routine (throws 403)', async () => {
      mockPrisma.routine.findFirst.mockResolvedValue(null); // Routine not found under Bob's ownership

      await expect(
        tasksService.create(userBobId, {
          title: 'Illicit routine task',
          category: TaskCategory.ROUTINE,
          priority: Priority.MEDIUM,
          schedulingMode: SchedulingMode.FIXED,
          routineId: 'alice-routine-777',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.routine.findFirst).toHaveBeenCalledWith({
        where: { id: 'alice-routine-777', userId: userBobId },
      });
    });

    it('allows User Bob to create task with his OWN project successfully', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'bob-proj-200', userId: userBobId });
      mockPrisma.task.create.mockResolvedValue({
        id: 'bob-task-1',
        userId: userBobId,
        title: 'Valid Bob Task',
        projectId: 'bob-proj-200',
        status: TaskStatus.TODO,
      });

      const result = await tasksService.create(userBobId, {
        title: 'Valid Bob Task',
        category: TaskCategory.WORK,
        priority: Priority.MEDIUM,
        schedulingMode: SchedulingMode.FLEXIBLE,
        projectId: 'bob-proj-200',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('bob-task-1');
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: userBobId,
            projectId: 'bob-proj-200',
          }),
        }),
      );
    });
  });
});
