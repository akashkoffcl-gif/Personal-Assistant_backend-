import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TaskCategory, Priority, SchedulingMode, TaskStatus, WellnessMetricType } from '@assistant/shared';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { RoutinesService } from '../src/modules/routines/routines.service';
import { WellnessService } from '../src/modules/wellness/wellness.service';
import { EmergenciesService } from '../src/modules/emergencies/emergencies.service';
import { SettingsService } from '../src/modules/settings/settings.service';

describe('API Functional Integration Suite', () => {
  let app: INestApplication;
  let tasksService: TasksService;
  let routinesService: RoutinesService;
  let wellnessService: WellnessService;
  let emergenciesService: EmergenciesService;
  let settingsService: SettingsService;

  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    tasksService = moduleFixture.get<TasksService>(TasksService);
    routinesService = moduleFixture.get<RoutinesService>(RoutinesService);
    wellnessService = moduleFixture.get<WellnessService>(WellnessService);
    emergenciesService = moduleFixture.get<EmergenciesService>(EmergenciesService);
    settingsService = moduleFixture.get<SettingsService>(SettingsService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Task Management: handles task creation across categories', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Complete NestJS Integration',
      category: TaskCategory.WORK,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 45,
    });

    expect(task).toBeDefined();
    expect(task.title).toBe('Complete NestJS Integration');
    expect(task.category).toBe(TaskCategory.WORK);
  });

  it('2. Routine Management: creates recurring routine definitions', async () => {
    const routine = await routinesService.create(testUserId, {
      title: 'Hydration Target',
      frequency: 'DAILY',
      targetQuantity: 2500,
      unit: 'ml',
      durationMinutes: 5,
    });

    expect(routine).toBeDefined();
    expect(routine.title).toBe('Hydration Target');
  });

  it('3. Wellness Tracking: logs metrics and computes daily summaries', async () => {
    const metric = await wellnessService.logMetric(testUserId, {
      type: WellnessMetricType.HYDRATION,
      value: 500,
      unit: 'ml',
    });

    expect(metric).toBeDefined();
    expect(metric.value).toBe(500);

    const summary = await wellnessService.getDailySummary(testUserId, '2026-10-29');
    expect(summary).toBeDefined();
    expect(summary.adherenceTrendLabel).toBeDefined();
  });

  it('4. Emergency Workflow: can trigger emergency replanning', async () => {
    const result = await emergenciesService.handleEmergency(testUserId, {
      title: 'Server Alert',
      estimatedDurationMinutes: 30,
    });

    expect(result.success).toBe(true);
    expect(result.emergencyTask).toBeDefined();
  });

  it('5. User Settings & Data Portability: exports user data', async () => {
    const exported = await settingsService.exportUserData(testUserId);
    expect(exported).toBeDefined();
    expect(exported.userId).toBe(testUserId);
    expect(exported.exportTimestamp).toBeDefined();
  });
});
