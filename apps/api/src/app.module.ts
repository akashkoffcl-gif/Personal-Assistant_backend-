import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './common/prisma.service';
import { RedisService } from './common/redis.service';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RoutinesModule } from './modules/routines/routines.module';
import { PlansModule } from './modules/plans/plans.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EmergenciesModule } from './modules/emergencies/emergencies.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WellnessModule } from './modules/wellness/wellness.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AutomationModule } from './modules/automation/automation.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';
import { FocusModule } from './modules/focus/focus.module';
import { FinanceModule } from './modules/finance/finance.module';
import { GoalsModule } from './modules/goals/goals.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { AIModule } from './modules/ai/ai.module';
import { CommonModule } from './common/common.module';
import { WorkerModule } from './worker/worker.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    TasksModule,
    RoutinesModule,
    PlansModule,
    SchedulingModule,
    EmergenciesModule,
    RemindersModule,
    NotificationsModule,
    WellnessModule,
    AnalyticsModule,
    SettingsModule,
    OutboxModule,
    ProjectsModule,
    AutomationModule,
    FollowUpsModule,
    FocusModule,
    FinanceModule,
    GoalsModule,
    KnowledgeModule,
    AIModule,
    WorkerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

