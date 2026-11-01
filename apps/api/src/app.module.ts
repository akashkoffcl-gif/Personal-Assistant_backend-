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
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    WorkerModule,
  ],
  providers: [PrismaService, RedisService],
})
export class AppModule {}

