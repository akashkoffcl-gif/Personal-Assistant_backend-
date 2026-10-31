import { SupabaseAuthGuard } from '../src/modules/auth/supabase-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { TaskCategory, Priority, SchedulingMode } from '@assistant/shared';

describe('Authentication & Ownership Verification', () => {
  let authGuard: SupabaseAuthGuard;
  let mockPrisma: any;
  const jwtSecret = 'test-jwt-secret-key-32-chars-minimum-length';

  beforeEach(() => {
    process.env.SUPABASE_JWT_SECRET = jwtSecret;
    mockPrisma = {
      isConnected: false,
      user: {
        upsert: jest.fn(),
      },
    };
    authGuard = new SupabaseAuthGuard(mockPrisma);
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('extracts user ID from valid Bearer JWT token payload', async () => {
    const token = jwt.sign(
      {
        sub: 'user-supabase-1234',
        email: 'alex@example.com',
        aud: 'authenticated',
        iss: 'supabase',
      },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const context = createMockContext({
      authorization: `Bearer ${token}`,
    });

    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect(request.user).toBeDefined();
    expect(request.user.id).toBe('user-supabase-1234');
    expect(request.user.email).toBe('alex@example.com');
  });

  it('falls back to development user ID when authorization header is absent in dev mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const context = createMockContext({});
    const result = await authGuard.canActivate(context);
    expect(result).toBe(true);

    const request = context.switchToHttp().getRequest();
    expect(request.user.id).toBe(SupabaseAuthGuard.DEFAULT_TEST_USER_ID);

    process.env.NODE_ENV = originalEnv;
  });

  it('rejects unauthenticated requests when in production mode without token', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const context = createMockContext({});
    await expect(authGuard.canActivate(context)).rejects.toThrow(UnauthorizedException);

    process.env.NODE_ENV = originalEnv;
  });

  it('strictly isolates resources by user ID (ownership enforcement)', async () => {
    // Verify that TasksService queries are strictly bounded by userId
    const mockDbTasks: any[] = [];
    const isolatedPrisma: any = {
      isConnected: true,
      task: {
        findMany: jest.fn(async ({ where }) => {
          return mockDbTasks.filter((t) => t.userId === where.userId);
        }),
        findFirst: jest.fn(async ({ where }) => {
          return mockDbTasks.find((t) => t.id === where.id && t.userId === where.userId) || null;
        }),
        create: jest.fn(async ({ data }) => {
          const created = { id: `task-${Date.now()}`, ...data };
          mockDbTasks.push(created);
          return created;
        }),
        delete: jest.fn(),
      },
      taskEvent: { create: jest.fn() },
      usageEvent: { create: jest.fn().mockResolvedValue({}) },
      reminder: { updateMany: jest.fn(), create: jest.fn() },
      outboxEvent: { create: jest.fn() },
    };

    const mockRedis: any = {
      invalidatePattern: jest.fn(),
    };
    const mockReminders: any = {
      scheduleReminderForTask: jest.fn(),
      invalidateTaskReminders: jest.fn(),
    };
    const mockOutbox: any = {
      publish: jest.fn(),
    };

    const tasksService = new TasksService(
      isolatedPrisma,
      mockRedis,
      mockReminders,
      mockOutbox,
    );

    const userA = 'user-aaa-111';
    const userB = 'user-bbb-222';

    // User A creates a task
    const taskA = await tasksService.create(userA, {
      title: 'Secret Notes for User A',
      category: TaskCategory.WORK,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 30,
    });

    // User A can view their own task
    const userATasks = await tasksService.findAll(userA);
    expect(userATasks.some((t) => t.id === taskA.id)).toBe(true);

    // User B cannot find User A's task in their task list
    const userBTasks = await tasksService.findAll(userB);
    expect(userBTasks.some((t) => t.id === taskA.id)).toBe(false);

    // User B attempting to fetch User A's task directly is rejected with NotFoundException (ownership guard)
    await expect(tasksService.findOne(userB, taskA.id)).rejects.toThrow();
  });
});

