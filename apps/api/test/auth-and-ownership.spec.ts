import { SupabaseAuthGuard } from '../src/modules/auth/supabase-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { TaskCategory, Priority, SchedulingMode } from '@assistant/shared';

describe('Authentication & Ownership Verification', () => {
  let authGuard: SupabaseAuthGuard;
  let mockPrisma: any;

  beforeEach(() => {
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
    // Generate valid base64url payload with sub
    const payload = { sub: 'user-supabase-1234', email: 'alex@example.com' };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const fakeJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.signature`;

    const context = createMockContext({
      authorization: `Bearer ${fakeJwt}`,
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
