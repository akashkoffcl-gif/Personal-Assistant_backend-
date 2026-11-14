import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIToolsService } from './ai-tools.service';
import { SmartPlannerService } from './smart-planner.service';
import { AIMemoryService } from './ai-memory.service';
import { AIDashboardCustomizationService } from './ai-customization.service';
import { JarvisToolRegistryService } from './jarvis-tool-registry.service';
import { WorkflowPlannerService } from './workflow/workflow-planner.service';
import { WorkflowOrchestratorService } from './workflow/workflow-orchestrator.service';
import { ConversationalIntentService } from './conversational-intent.service';
import { BehaviouralContextService } from './behavioral-context.service';
import { ConversationalPersonalityEngine } from './conversational-personality.service';
import { ProactiveIntelligenceService } from './proactive-intelligence.service';
import { UnifiedContextService } from './unified-context.service';
import { ReasoningEngineService } from './reasoning-engine.service';
import { DigitalActionOrchestratorService } from './digital-action-orchestrator.service';
import { AdaptivePersonalizationService } from './adaptive-personalization.service';
import { NotificationCapabilityService } from '../mobile/notification-capability.service';
import { MobileModule } from '../mobile/mobile.module';
import { AIController } from './ai.controller';
import { WorkerModule } from '../../worker/worker.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { AutomationModule } from '../automation/automation.module';
import { FinanceModule } from '../finance/finance.module';
import { RoutinesModule } from '../routines/routines.module';
import { WellnessModule } from '../wellness/wellness.module';
import { FocusModule } from '../focus/focus.module';
import { GoalsModule } from '../goals/goals.module';
import { EmergenciesModule } from '../emergencies/emergencies.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FollowUpsModule } from '../follow-ups/follow-ups.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    WorkerModule,
    TasksModule,
    ProjectsModule,
    AutomationModule,
    FinanceModule,
    RoutinesModule,
    WellnessModule,
    FocusModule,
    GoalsModule,
    EmergenciesModule,
    KnowledgeModule,
    NotificationsModule,
    FollowUpsModule,
    SettingsModule,
    MobileModule,
  ],
  controllers: [AIController],
  providers: [
    AIService,
    AIToolsService,
    SmartPlannerService,
    AIMemoryService,
    AIDashboardCustomizationService,
    JarvisToolRegistryService,
    WorkflowPlannerService,
    WorkflowOrchestratorService,
    ConversationalIntentService,
    BehaviouralContextService,
    ConversationalPersonalityEngine,
    ProactiveIntelligenceService,
    UnifiedContextService,
    ReasoningEngineService,
    DigitalActionOrchestratorService,
    AdaptivePersonalizationService,
  ],
  exports: [
    AIService,
    SmartPlannerService,
    AIToolsService,
    AIMemoryService,
    AIDashboardCustomizationService,
    JarvisToolRegistryService,
    WorkflowPlannerService,
    WorkflowOrchestratorService,
    ConversationalIntentService,
    BehaviouralContextService,
    ConversationalPersonalityEngine,
    ProactiveIntelligenceService,
    UnifiedContextService,
    ReasoningEngineService,
    DigitalActionOrchestratorService,
    AdaptivePersonalizationService,
  ],
})
export class AIModule {}

