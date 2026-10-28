import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { SupabaseAuthGuard } from '../src/modules/auth/supabase-auth.guard';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { RoutinesService } from '../src/modules/routines/routines.service';
import { WellnessService } from '../src/modules/wellness/wellness.service';
import { RedisService } from '../src/common/redis.service';
import { RemindersService } from '../src/modules/reminders/reminders.service';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import {
  TaskCategory,
  TaskStatus,
  Priority,
  SchedulingMode,
  RecurrenceFrequency,
  WellnessMetricType,
} from '@assistant/shared';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('Supabase Live Database & Cryptographic Auth Integration Suite', () => {
  let prisma: any;
  let redis: RedisService;
  let outboxService: OutboxService;
  let remindersService: RemindersService;
  let tasksService: TasksService;
  let routinesService: RoutinesService;
  let wellnessService: WellnessService;
  let authGuard: SupabaseAuthGuard;

  const testUserA = '11111111-aaaa-4444-8888-000000000001';
  const testUserB = '22222222-bbbb-4444-8888-000000000002';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'dev-jwt-secret-key-at-least-32-chars-long';

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    prisma.isConnected = true;

    redis = new RedisService();
    outboxService = new OutboxService(prisma);
    remindersService = new RemindersService(prisma, redis);
    tasksService = new TasksService(prisma, redis, remindersService, outboxService);
    routinesService = new RoutinesService(prisma, redis);
    wellnessService = new WellnessService(prisma, redis);
    authGuard = new SupabaseAuthGuard(prisma);
  }, 20000);

  afterAll(async () => {
    // Clean up test users and their cascade-related records
    try {
      await prisma.user.deleteMany({
        where: { id: { in: [testUserA, testUserB] } },
      });
      await prisma.$disconnect();
    } catch (e) {}
  }, 20000);

  // --------------------------------------------------------------------------
  // OBJECTIVE 2: LIVE SUPABASE POSTGRESQL CONNECTIVITY
  // --------------------------------------------------------------------------
  it('1. Live Database Connectivity: establishes verified connection to Supabase PostgreSQL', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected;`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(Number(result[0].connected)).toBe(1);
  });

  // --------------------------------------------------------------------------
  // OBJECTIVE 5: CRYPTOGRAPHIC JWT SIGNATURE, ISSUER, AUDIENCE & EXPIRATION
  // --------------------------------------------------------------------------
  describe('2. Supabase Auth Cryptographic JWT Verification', () => {
    const createMockContext = (authHeader?: string): ExecutionContext => {
      const request: any = { headers: {} };
      if (authHeader) request.headers['authorization'] = authHeader;
      return {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
    };

    it('accepts valid cryptographic JWT signature with proper audience and issuer', async () => {
      const token = jwt.sign(
        {
          sub: testUserA,
          email: 'alex@assistant.local',
          aud: 'authenticated',
          iss: 'supabase',
          role: 'authenticated',
        },
        jwtSecret,
        { algorithm: 'HS256', expiresIn: '1h' },
      );

      const ctx = createMockContext(`Bearer ${token}`);
      const canActivate = await authGuard.canActivate(ctx);
      expect(canActivate).toBe(true);

      const req = ctx.switchToHttp().getRequest();
      expect(req.user.id).toBe(testUserA);
      expect(req.user.email).toBe('alex@assistant.local');
    });

    it('rejects forged JWT signed with an invalid secret (SignatureVerificationError)', async () => {
      const forgedToken = jwt.sign(
        {
          sub: testUserA,
          email: 'hacker@malicious.local',
          aud: 'authenticated',
          iss: 'supabase',
        },
        'wrong-secret-key-12345678901234567890',
        { algorithm: 'HS256', expiresIn: '1h' },
      );

      const ctx = createMockContext(`Bearer ${forgedToken}`);
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        /Cryptographic token validation failed|invalid signature/i,
      );
    });

    it('rejects expired JWT tokens (TokenExpiredError)', async () => {
      const expiredToken = jwt.sign(
        {
          sub: testUserA,
          email: 'alex@assistant.local',
          aud: 'authenticated',
          iss: 'supabase',
        },
        jwtSecret,
        { algorithm: 'HS256', expiresIn: '-10s' }, // Expired 10 seconds ago
      );

      const ctx = createMockContext(`Bearer ${expiredToken}`);
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        /token has expired/i,
      );
    });

    it('rejects tokens with invalid audience', async () => {
      const badAudToken = jwt.sign(
        {
          sub: testUserA,
          email: 'alex@assistant.local',
          aud: 'unauthorized_audience',
          iss: 'supabase',
        },
        jwtSecret,
        { algorithm: 'HS256', expiresIn: '1h' },
      );

      const ctx = createMockContext(`Bearer ${badAudToken}`);
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        /Invalid token audience/i,
      );
    });

    it('rejects unauthenticated requests in production without fallback', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const ctx = createMockContext();
      await expect(authGuard.canActivate(ctx)).rejects.toThrow(
        /Bearer token is required/i,
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  // --------------------------------------------------------------------------
  // OBJECTIVE 6: USER PROFILE IDENTITY MAPPING & OWNERSHIP ISOLATION
  // --------------------------------------------------------------------------
  describe('3. User Identity Mapping & Multi-tenant Ownership Isolation', () => {
    it('synchronizes authenticated user into permanent PostgreSQL User and UserSettings models', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserA },
        include: { settings: true },
      });

      expect(user).toBeDefined();
      expect(user.id).toBe(testUserA);
      expect(user.settings).toBeDefined();
      expect(user.settings.workStartHour).toBe(9);
    });

    it('enforces multi-tenant ownership boundaries across database records', async () => {
      // User A creates a task in the real database
      const taskA = await tasksService.create(testUserA, {
        title: 'User A Confidential Strategy',
        category: TaskCategory.WORK,
        priority: Priority.HIGH,
      });

      // User A can access their own task
      const userATasks = await tasksService.findAll(testUserA);
      expect(userATasks.some((t) => t.id === taskA.id)).toBe(true);

      // User B cannot find User A's task in their task list
      const userBTasks = await tasksService.findAll(testUserB);
      expect(userBTasks.some((t) => t.id === taskA.id)).toBe(false);

      // User B is rejected if attempting to access User A's task
      await expect(tasksService.findOne(testUserB, taskA.id)).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // OBJECTIVE 7: REAL DATABASE TASK, ROUTINE, WELLNESS & EVENT HISTORY TESTS
  // --------------------------------------------------------------------------
  describe('4. Real Database Operations & Historical Persistence', () => {
    it('creates tasks across all four categories in live PostgreSQL', async () => {
      const routineTask = await tasksService.create(testUserA, {
        title: 'Drink Morning Water',
        category: TaskCategory.PERSONAL_ROUTINE,
        priority: Priority.MEDIUM,
        estimatedDurationMinutes: 5,
      });
      expect(routineTask.id).toBeDefined();
      expect(routineTask.category).toBe(TaskCategory.PERSONAL_ROUTINE);

      const workTask = await tasksService.create(testUserA, {
        title: 'Deploy Production API',
        category: TaskCategory.WORK,
        priority: Priority.URGENT,
        estimatedDurationMinutes: 60,
      });
      expect(workTask.id).toBeDefined();
      expect(workTask.category).toBe(TaskCategory.WORK);

      const planTask = await tasksService.create(testUserA, {
        title: 'Day Planning Session',
        category: TaskCategory.DAY_PLAN,
        priority: Priority.LOW,
      });
      expect(planTask.category).toBe(TaskCategory.DAY_PLAN);

      const emergencyTask = await tasksService.create(testUserA, {
        title: 'Security Patch Release',
        category: TaskCategory.EMERGENCY,
        priority: Priority.URGENT,
      });
      expect(emergencyTask.category).toBe(TaskCategory.EMERGENCY);
    });

    it('records complete TaskEvent history in PostgreSQL across lifecycle (Complete, Snooze, Reschedule)', async () => {
      const task = await tasksService.create(testUserA, {
        title: 'Complete Lifecycle Test',
        category: TaskCategory.WORK,
        scheduledStartTime: new Date().toISOString(),
      });

      // 1. Snooze
      await tasksService.snooze(testUserA, task.id, 15, 'In a meeting');

      // 2. Reschedule
      const futureTime = new Date(Date.now() + 3600000).toISOString();
      await tasksService.reschedule(testUserA, task.id, futureTime);

      // 3. Complete
      await tasksService.complete(testUserA, task.id);

      // 4. Retrieve persistent event history from PostgreSQL
      const events = await tasksService.getEvents(testUserA, task.id);
      expect(events.length).toBeGreaterThanOrEqual(4);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain('CREATED');
      expect(eventTypes).toContain('SNOOZED');
      expect(eventTypes).toContain('RESCHEDULED');
      expect(eventTypes).toContain('COMPLETED');
    });

    it('preserves historical routine occurrences when a routine definition is edited', async () => {
      // Create routine definition
      const routine = await routinesService.create(testUserA, {
        title: 'Hydration 2L',
        frequency: RecurrenceFrequency.DAILY,
        targetQuantity: 2000,
        unit: 'ml',
        durationMinutes: 5,
      });

      // Generate occurrence and record completion
      const dateStr = '2026-10-29';
      const occurrences = await routinesService.getOccurrencesForDate(testUserA, dateStr);
      const ourOcc = occurrences.find((o) => o.routineId === routine.id);
      expect(ourOcc).toBeDefined();

      await routinesService.recordOccurrence(testUserA, ourOcc.id, {
        status: TaskStatus.COMPLETED,
        actualQuantity: 2000,
        notes: 'Goal achieved',
      });

      // Verify streak incremented to 1
      const updatedRoutine = await routinesService.findOne(testUserA, routine.id);
      expect(updatedRoutine.streakCount).toBe(1);

      // EDIT THE ROUTINE DEFINITION (e.g. increase target to 2500ml)
      await routinesService.update(testUserA, routine.id, {
        title: 'Hydration 2.5L Target',
        targetQuantity: 2500,
      });

      // Verify historical occurrence record is PRESERVED and NOT ERASED
      const preservedOcc = await prisma.routineOccurrence.findUnique({
        where: { id: ourOcc.id },
      });
      expect(preservedOcc).toBeDefined();
      expect(preservedOcc.status).toBe(TaskStatus.COMPLETED);
      expect(preservedOcc.actualQuantity).toBe(2000);
      expect(preservedOcc.notes).toBe('Goal achieved');
    });

    it('logs wellness metrics and persists daily summary calculations in PostgreSQL', async () => {
      const date = '2026-10-29';

      // Log hydration
      await wellnessService.logMetric(testUserA, {
        type: WellnessMetricType.HYDRATION,
        value: 500,
        unit: 'ml',
        recordedAt: `${date}T10:00:00.000Z`,
      });

      // Log workout
      await wellnessService.logMetric(testUserA, {
        type: WellnessMetricType.EXERCISE,
        value: 45,
        unit: 'minutes',
        recordedAt: `${date}T11:00:00.000Z`,
      });

      // Log subjective check-in
      await wellnessService.recordCheckIn(testUserA, {
        energyScore: 4,
        moodScore: 5,
        checkInDate: date,
      });

      // Retrieve and verify persistent calculation
      const summary = await wellnessService.getDailySummary(testUserA, date);
      expect(summary.hydrationTotalMl).toBeGreaterThanOrEqual(500);
      expect(summary.exerciseDurationMinutes).toBeGreaterThanOrEqual(45);
      expect(summary.checkIn).toBeDefined();
      expect(summary.checkIn.moodScore).toBe(5);
    });
  });
});
