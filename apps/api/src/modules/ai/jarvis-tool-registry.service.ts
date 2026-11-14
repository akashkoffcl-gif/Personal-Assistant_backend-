import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AIToolsService } from './ai-tools.service';
import { AIMemoryService } from './ai-memory.service';
import { AIDashboardCustomizationService } from './ai-customization.service';
import { SmartPlannerService } from './smart-planner.service';
import { TasksService } from '../tasks/tasks.service';
import { ProjectsService } from '../projects/projects.service';
import { AutomationService } from '../automation/automation.service';
import { FinanceService } from '../finance/finance.service';
import { RoutinesService } from '../routines/routines.service';
import { WellnessService } from '../wellness/wellness.service';
import { FocusService } from '../focus/focus.service';
import { GoalsService } from '../goals/goals.service';
import { EmergenciesService } from '../emergencies/emergencies.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FollowUpsService } from '../follow-ups/follow-ups.service';
import { SettingsService } from '../settings/settings.service';
import { WellnessMetricType, Priority } from '@assistant/shared';

export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface JarvisToolDefinition {
  id: string;
  name: string;
  category:
    | 'PERSONAL_MANAGEMENT'
    | 'TASK_MANAGEMENT'
    | 'PROJECT_MANAGEMENT'
    | 'CALENDAR_ROUTINES'
    | 'FINANCIAL_INTELLIGENCE'
    | 'KNOWLEDGE_MANAGEMENT'
    | 'ANALYTICS'
    | 'NOTIFICATIONS'
    | 'APPLICATION_CUSTOMIZATION'
    | 'AUTOMATION'
    | 'WELLNESS'
    | 'FOCUS'
    | 'GOALS'
    | 'EMERGENCIES'
    | 'SETTINGS'
    | 'CLIENT_NAVIGATION';
  description: string;
  riskLevel: ToolRiskLevel;
  requiresConfirmation: boolean;
  inputSchema: Record<string, any>;
  execute: (userId: string, input: any) => Promise<any>;
}

@Injectable()
export class JarvisToolRegistryService {
  private readonly logger = new Logger(JarvisToolRegistryService.name);
  private readonly tools = new Map<string, JarvisToolDefinition>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTools: AIToolsService,
    private readonly aiMemory: AIMemoryService,
    private readonly aiCustomization: AIDashboardCustomizationService,
    private readonly smartPlanner: SmartPlannerService,
    private readonly tasksService: TasksService,
    private readonly projectsService: ProjectsService,
    private readonly automationService: AutomationService,
    private readonly financeService: FinanceService,
    private readonly routinesService: RoutinesService,
    private readonly wellnessService: WellnessService,
    private readonly focusService: FocusService,
    private readonly goalsService: GoalsService,
    private readonly emergenciesService: EmergenciesService,
    private readonly knowledgeService: KnowledgeService,
    private readonly notificationsService: NotificationsService,
    private readonly followUpsService: FollowUpsService,
    private readonly settingsService: SettingsService,
  ) {
    this.registerAllCapabilities();
  }

  private registerAllCapabilities() {
    // ====================================================
    // A. PERSONAL MANAGEMENT & IDENTITY
    // ====================================================
    this.register({
      id: 'get_personal_profile',
      name: 'Get Personal Profile',
      category: 'PERSONAL_MANAGEMENT',
      description: 'Retrieves user profile, account details, and active timezone.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, fullName: true, timezone: true, createdAt: true },
        }),
    });

    this.register({
      id: 'get_personal_memories',
      name: 'Get Personal Memories',
      category: 'PERSONAL_MANAGEMENT',
      description: 'Retrieves all user-approved persistent memories, habits, and preferences.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.aiMemory.getMemories(userId),
    });

    this.register({
      id: 'remember_preference',
      name: 'Remember Preference',
      category: 'PERSONAL_MANAGEMENT',
      description: 'Saves or updates a permanent personal preference or work habit.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: false,
      inputSchema: { category: 'string', key: 'string', value: 'string' },
      execute: async (userId, input) => {
        if (!input.key || !input.value) throw new BadRequestException('key and value are required');
        return this.aiMemory.remember(userId, input.category || 'PREFERENCE', input.key, input.value);
      },
    });

    this.register({
      id: 'forget_memory',
      name: 'Forget Memory',
      category: 'PERSONAL_MANAGEMENT',
      description: 'Removes a specific stored personal memory entry.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: false,
      inputSchema: { memoryId: 'string' },
      execute: async (userId, input) => {
        if (!input.memoryId) throw new BadRequestException('memoryId is required');
        return this.aiMemory.forget(userId, input.memoryId);
      },
    });

    this.register({
      id: 'clear_all_memories',
      name: 'Clear All Personal Memories',
      category: 'PERSONAL_MANAGEMENT',
      description: 'Clears all stored AI memories and personal preferences.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: {},
      execute: async (userId) => {
        const deleted = await this.prisma.knowledgeNote.deleteMany({
          where: {
            userId,
            title: { startsWith: '[JARVIS_MEMORY]' },
          },
        });
        return { success: true, count: deleted.count, message: 'All personal preferences cleared' };
      },
    });

    // ====================================================
    // B. TASK MANAGEMENT
    // ====================================================
    this.register({
      id: 'create_task',
      name: 'Create Task',
      category: 'TASK_MANAGEMENT',
      description: 'Creates a new actionable task with priority and duration.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', priority: 'HIGH|MEDIUM|LOW|URGENT', estimatedDurationMinutes: 'number', projectId: 'string' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Task title is required');
        return this.tasksService.create(userId, {
          title: input.title,
          priority: input.priority || 'MEDIUM',
          estimatedDurationMinutes: input.estimatedDurationMinutes || 30,
          projectId: input.projectId,
        });
      },
    });

    this.register({
      id: 'create_subtask',
      name: 'Create Subtask',
      category: 'TASK_MANAGEMENT',
      description: 'Creates a nested subtask attached to an existing parent task.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { parentTaskId: 'string', title: 'string', estimatedDurationMinutes: 'number' },
      execute: async (userId, input) => {
        if (!input.parentTaskId || !input.title) throw new BadRequestException('parentTaskId and title are required');
        return this.tasksService.create(userId, {
          title: input.title,
          parentTaskId: input.parentTaskId,
          estimatedDurationMinutes: input.estimatedDurationMinutes || 15,
          priority: input.priority || 'MEDIUM',
        });
      },
    });

    this.register({
      id: 'complete_task',
      name: 'Complete Task',
      category: 'TASK_MANAGEMENT',
      description: 'Marks an existing task as completed.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { taskId: 'string' },
      execute: async (userId, input) => {
        if (!input.taskId) throw new BadRequestException('taskId is required');
        return this.tasksService.complete(userId, input.taskId);
      },
    });

    this.register({
      id: 'update_task',
      name: 'Update Task',
      category: 'TASK_MANAGEMENT',
      description: 'Updates task title, priority, estimated duration, or deadline.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { taskId: 'string', title: 'string', priority: 'HIGH|MEDIUM|LOW|URGENT', deadline: 'string' },
      execute: async (userId, input) => {
        if (!input.taskId) throw new BadRequestException('taskId is required');
        return this.tasksService.update(userId, input.taskId, {
          title: input.title,
          priority: input.priority,
          deadline: input.deadline,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
        });
      },
    });

    this.register({
      id: 'reschedule_task',
      name: 'Reschedule Task',
      category: 'TASK_MANAGEMENT',
      description: 'Reschedules a task start and end time.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { taskId: 'string', scheduledStartTime: 'string', scheduledEndTime: 'string' },
      execute: async (userId, input) => {
        if (!input.taskId || !input.scheduledStartTime) throw new BadRequestException('taskId and scheduledStartTime required');
        return this.tasksService.reschedule(userId, input.taskId, input.scheduledStartTime, input.scheduledEndTime);
      },
    });

    this.register({
      id: 'delete_task',
      name: 'Delete Task',
      category: 'TASK_MANAGEMENT',
      description: 'Permanently removes a task from the schedule backlog.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { taskId: 'string' },
      execute: async (userId, input) => {
        const id = input.taskId || input.id;
        if (!id) throw new BadRequestException('taskId is required');
        return this.tasksService.remove(userId, id);
      },
    });

    this.register({
      id: 'get_overdue_tasks',
      name: 'Get Overdue Tasks',
      category: 'TASK_MANAGEMENT',
      description: 'Retrieves all tasks that have exceeded their scheduled deadlines.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => {
        const all = await this.tasksService.findAll(userId);
        return all.filter((t: any) => t.isOverdue || (t.deadline && new Date(t.deadline) < new Date() && t.status !== 'COMPLETED'));
      },
    });

    // ====================================================
    // C. PROJECT MANAGEMENT
    // ====================================================
    this.register({
      id: 'get_projects_status',
      name: 'Get Projects Status',
      category: 'PROJECT_MANAGEMENT',
      description: 'Retrieves all active projects, linked tasks count, and progress percent.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.projectsService.getProjects(userId),
    });

    this.register({
      id: 'create_project',
      name: 'Create Project',
      category: 'PROJECT_MANAGEMENT',
      description: 'Creates a new strategic project.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', description: 'string', color: 'string', targetDate: 'string' },
      execute: async (userId, input) => {
        if (!input.title && !input.name) throw new BadRequestException('Project title is required');
        return this.projectsService.createProject(userId, {
          title: input.title || input.name || 'New Strategic Project',
          description: input.description,
          color: input.color || '#8B45F5',
          targetDate: input.targetDate,
        });
      },
    });

    this.register({
      id: 'update_project_status',
      name: 'Update Project Status',
      category: 'PROJECT_MANAGEMENT',
      description: 'Updates a strategic project status or title.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { projectId: 'string', status: 'ACTIVE|COMPLETED|ON_HOLD|ARCHIVED', title: 'string' },
      execute: async (userId, input) => {
        if (!input.projectId) throw new BadRequestException('projectId is required');
        return this.projectsService.updateProject(userId, input.projectId, {
          status: input.status,
          title: input.title,
        });
      },
    });

    this.register({
      id: 'delete_project',
      name: 'Delete Project',
      category: 'PROJECT_MANAGEMENT',
      description: 'Deletes a project and disassociates its tasks.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { projectId: 'string' },
      execute: async (userId, input) => {
        const id = input.projectId || input.id;
        if (!id) throw new BadRequestException('projectId is required');
        return this.projectsService.deleteProject(userId, id);
      },
    });

    // ====================================================
    // D. CALENDAR AND ROUTINES
    // ====================================================
    this.register({
      id: 'get_daily_schedule',
      name: 'Get Daily Schedule',
      category: 'CALENDAR_ROUTINES',
      description: 'Retrieves full timeline, tasks, and routines for a specific date.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { date: 'string' },
      execute: async (userId, input) =>
        this.aiTools.getDaySchedule(userId, input?.date || new Date().toISOString().substring(0, 10)),
    });

    this.register({
      id: 'generate_smart_day_plan',
      name: 'Generate Smart Day Plan',
      category: 'CALENDAR_ROUTINES',
      description: 'Calculates an AI-optimized daily schedule resolving task conflicts.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { date: 'string', bufferMinutes: 'number' },
      execute: async (userId, input) =>
        this.smartPlanner.proposeDayPlan(userId, input?.date || new Date().toISOString().substring(0, 10), {
          bufferMinutes: input?.bufferMinutes || 10,
        }),
    });

    this.register({
      id: 'apply_day_plan',
      name: 'Apply Day Plan',
      category: 'CALENDAR_ROUTINES',
      description: 'Applies a generated smart day plan proposal to the user schedule.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { proposalId: 'string' },
      execute: async (userId, input) => {
        if (!input.proposalId) throw new BadRequestException('proposalId is required');
        return this.smartPlanner.applyDayPlan(userId, input.proposalId);
      },
    });

    this.register({
      id: 'get_routine_streaks',
      name: 'Get Routine Streaks',
      category: 'CALENDAR_ROUTINES',
      description: 'Retrieves recurring daily/weekly routines and their current streak counts.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.routinesService.findAll(userId),
    });

    this.register({
      id: 'complete_routine',
      name: 'Complete Routine',
      category: 'CALENDAR_ROUTINES',
      description: 'Marks a habit or routine occurrence as completed for today.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { occurrenceId: 'string', quantity: 'number' },
      execute: async (userId, input) => {
        if (!input.occurrenceId) throw new BadRequestException('occurrenceId is required');
        return this.routinesService.recordOccurrence(userId, input.occurrenceId, {
          status: 'COMPLETED' as any,
          actualQuantity: input.quantity,
        });
      },
    });

    this.register({
      id: 'create_routine',
      name: 'Create Routine',
      category: 'CALENDAR_ROUTINES',
      description: 'Creates a recurring routine habit.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', frequency: 'DAILY|WEEKLY', targetTime: 'string', targetQuantity: 'number' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Routine title is required');
        return this.routinesService.create(userId, {
          title: input.title,
          frequency: input.frequency || 'DAILY',
          targetTime: input.targetTime || '09:00',
          targetQuantity: input.targetQuantity || 1,
          category: input.category || 'HEALTH',
        });
      },
    });

    // ====================================================
    // E. FINANCIAL INTELLIGENCE
    // ====================================================
    this.register({
      id: 'get_finance_summary',
      name: 'Get Finance Summary',
      category: 'FINANCIAL_INTELLIGENCE',
      description: 'Retrieves total income, expenditures, net savings, and budget health.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.aiTools.getFinanceSummary(userId),
    });

    this.register({
      id: 'get_finance_accounts',
      name: 'Get Finance Accounts',
      category: 'FINANCIAL_INTELLIGENCE',
      description: 'Retrieves list of user financial accounts and current balances.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.financeService.getAccounts(userId),
    });

    this.register({
      id: 'create_transaction_entry',
      name: 'Create Transaction Entry',
      category: 'FINANCIAL_INTELLIGENCE',
      description: 'Records an authorized financial transaction entry.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { accountId: 'string', amount: 'number', type: 'INCOME|EXPENSE|TRANSFER', categoryId: 'string', description: 'string' },
      execute: async (userId, input) => {
        if (!input.accountId || !input.amount || !input.type) {
          throw new BadRequestException('accountId, amount, and type are required');
        }
        return this.financeService.createTransaction(userId, {
          accountId: input.accountId,
          amount: Number(input.amount),
          type: input.type,
          categoryId: input.categoryId,
          description: input.description || 'Logged via Assistant',
          date: input.date || new Date().toISOString(),
        });
      },
    });

    // ====================================================
    // F. KNOWLEDGE MANAGEMENT
    // ====================================================
    this.register({
      id: 'search_knowledge_hub',
      name: 'Search Knowledge Hub',
      category: 'KNOWLEDGE_MANAGEMENT',
      description: 'Executes indexed full-text search across documents, notes, and tags.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { query: 'string' },
      execute: async (userId, input) => this.aiTools.searchKnowledge(userId, input?.query || ''),
    });

    this.register({
      id: 'create_knowledge_note',
      name: 'Create Knowledge Note',
      category: 'KNOWLEDGE_MANAGEMENT',
      description: 'Saves a new note or second-brain documentation snippet.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', content: 'string', tags: 'array' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Note title is required');
        return this.knowledgeService.createNote(userId, {
          title: input.title,
          content: input.content || '',
          category: input.category || 'NOTE',
          tags: input.tags || [],
        });
      },
    });

    this.register({
      id: 'delete_knowledge_note',
      name: 'Delete Knowledge Note',
      category: 'KNOWLEDGE_MANAGEMENT',
      description: 'Soft-deletes or removes a knowledge note.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { noteId: 'string' },
      execute: async (userId, input) => {
        if (!input.noteId) throw new BadRequestException('noteId is required');
        return this.knowledgeService.deleteNote(userId, input.noteId);
      },
    });

    // ====================================================
    // G. ANALYTICS & WELLNESS
    // ====================================================
    this.register({
      id: 'get_productivity_analytics',
      name: 'Get Productivity Analytics',
      category: 'ANALYTICS',
      description: 'Analyzes completion rates, focus session hours, and weekly velocity.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.aiTools.getUserProgressAnalysis(userId),
    });

    this.register({
      id: 'log_water_intake',
      name: 'Log Water Intake',
      category: 'WELLNESS',
      description: 'Logs daily hydration volume in milliliters.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { amountMl: 'number' },
      execute: async (userId, input) => {
        const val = Number(input.amountMl || input.value || 250);
        return this.wellnessService.logMetric(userId, {
          type: WellnessMetricType.HYDRATION,
          value: val,
          unit: 'ml',
          notes: 'Logged via Nova Assistant',
        });
      },
    });

    this.register({
      id: 'log_exercise',
      name: 'Log Exercise',
      category: 'WELLNESS',
      description: 'Logs exercise duration in minutes and workout details.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { durationMinutes: 'number', activityName: 'string' },
      execute: async (userId, input) => {
        const val = Number(input.durationMinutes || input.value || 30);
        return this.wellnessService.logMetric(userId, {
          type: WellnessMetricType.EXERCISE,
          value: val,
          unit: 'minutes',
          notes: input.activityName || 'Workout session',
        });
      },
    });

    this.register({
      id: 'log_sleep',
      name: 'Log Sleep',
      category: 'WELLNESS',
      description: 'Logs sleep duration in hours and quality rating.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { durationHours: 'number', quality: 'string' },
      execute: async (userId, input) => {
        const val = Number(input.durationHours || input.value || 8);
        return this.wellnessService.logMetric(userId, {
          type: WellnessMetricType.SLEEP,
          value: val,
          unit: 'hours',
          notes: input.quality ? `Quality: ${input.quality}` : 'Sleep duration',
        });
      },
    });

    this.register({
      id: 'get_wellness_summary',
      name: 'Get Wellness Summary',
      category: 'WELLNESS',
      description: 'Retrieves today hydration, sleep, exercise, and daily balance score.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { date: 'string' },
      execute: async (userId, input) => {
        const d = input?.date || new Date().toISOString().substring(0, 10);
        return this.wellnessService.getDailySummary(userId, d);
      },
    });

    // ====================================================
    // H. FOCUS STUDIO
    // ====================================================
    this.register({
      id: 'start_focus_session',
      name: 'Start Focus Session',
      category: 'FOCUS',
      description: 'Starts a deep work Pomodoro or timed focus session.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { plannedDurationMinutes: 'number', taskId: 'string', notes: 'string' },
      execute: async (userId, input) => {
        return this.focusService.startSession(userId, {
          plannedDurationMinutes: input.plannedDurationMinutes || input.durationMinutes || 25,
          taskId: input.taskId,
          notes: input.notes,
        });
      },
    });

    this.register({
      id: 'pause_focus_session',
      name: 'Pause Focus Session',
      category: 'FOCUS',
      description: 'Pauses an ongoing active focus session.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { sessionId: 'string' },
      execute: async (userId, input) => {
        if (!input.sessionId) {
          const active = await this.focusService.getCurrentSession(userId);
          if (!active?.session) throw new NotFoundException('No active focus session to pause');
          return this.focusService.pauseSession(userId, active.session.id);
        }
        return this.focusService.pauseSession(userId, input.sessionId);
      },
    });

    this.register({
      id: 'finish_focus_session',
      name: 'Finish Focus Session',
      category: 'FOCUS',
      description: 'Completes and logs the current active focus session.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { sessionId: 'string', notes: 'string' },
      execute: async (userId, input) => {
        const id = input.sessionId || input.id;
        if (!id) {
          const active = await this.focusService.getCurrentSession(userId);
          if (!active?.session) throw new NotFoundException('No active focus session to complete');
          return this.focusService.completeSession(userId, active.session.id, input.notes);
        }
        return this.focusService.completeSession(userId, id, input.notes);
      },
    });

    this.register({
      id: 'abort_focus_session',
      name: 'Abort Focus Session',
      category: 'FOCUS',
      description: 'Aborts and cancels an active focus session due to workflow rollback.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { sessionId: 'string' },
      execute: async (userId, input) => {
        const id = input.sessionId || input.id;
        if (!id) {
          const active = await this.focusService.getCurrentSession(userId);
          if (!active?.session) throw new NotFoundException('No active focus session to abort');
          return this.focusService.abandonSession(userId, active.session.id);
        }
        return this.focusService.abandonSession(userId, id);
      },
    });

    this.register({
      id: 'get_focus_analytics',
      name: 'Get Focus Analytics',
      category: 'FOCUS',
      description: 'Retrieves focus time metrics, completed sessions, and weekly adherence.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.aiTools.getFocusSummary(userId),
    });

    // ====================================================
    // I. GOALS MANAGEMENT
    // ====================================================
    this.register({
      id: 'create_goal',
      name: 'Create Goal',
      category: 'GOALS',
      description: 'Creates a personal or professional strategic goal.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', type: 'string', priority: 'HIGH|MEDIUM|LOW' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Goal title is required');
        return this.goalsService.createGoal(userId, {
          title: input.title,
          type: input.type || 'SHORT_TERM',
          priority: input.priority || 'MEDIUM',
          description: input.description,
          targetDate: input.targetDate,
        });
      },
    });

    this.register({
      id: 'update_goal_progress',
      name: 'Update Goal Progress',
      category: 'GOALS',
      description: 'Updates goal progress percentage and appends a progress entry.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: false,
      inputSchema: { goalId: 'string', progressPercent: 'number', notes: 'string' },
      execute: async (userId, input) => {
        if (!input.goalId) throw new BadRequestException('goalId is required');
        return this.goalsService.logProgress(userId, input.goalId, {
          progressPercent: Number(input.progressPercent),
          notes: input.notes,
        });
      },
    });

    // ====================================================
    // J. EMERGENCIES & REPLANNING
    // ====================================================
    this.register({
      id: 'report_emergency',
      name: 'Report Emergency',
      category: 'EMERGENCIES',
      description: 'Logs an urgent emergency task and recalculates the day schedule with conflict resolution.',
      riskLevel: 'HIGH',
      requiresConfirmation: true,
      inputSchema: { title: 'string', estimatedDurationMinutes: 'number', autoRescheduleFlexible: 'boolean' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Emergency title is required');
        return this.emergenciesService.handleEmergency(userId, {
          title: input.title,
          estimatedDurationMinutes: input.estimatedDurationMinutes || 60,
          autoRescheduleFlexible: input.autoRescheduleFlexible ?? true,
        });
      },
    });

    this.register({
      id: 'get_emergency_status',
      name: 'Get Emergency Status',
      category: 'EMERGENCIES',
      description: 'Checks whether an active emergency replanning session is in effect.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => {
        const emergencyTasks = await this.prisma.task.findMany({
          where: { userId, priority: Priority.URGENT, status: { in: ['TODO', 'IN_PROGRESS'] } },
        });
        return {
          hasActiveEmergency: emergencyTasks.length > 0,
          urgentTasksCount: emergencyTasks.length,
          urgentTasks: emergencyTasks.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline })),
        };
      },
    });

    // ====================================================
    // K. NOTIFICATIONS & FOLLOW-UPS
    // ====================================================
    this.register({
      id: 'create_reminder',
      name: 'Create Reminder',
      category: 'NOTIFICATIONS',
      description: 'Schedules a notification reminder at a specific timestamp.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { title: 'string', triggerTime: 'string' },
      execute: async (userId, input) => {
        if (!input.title) throw new BadRequestException('Reminder title is required');
        const triggerTime = input.triggerTime || input.time || new Date(Date.now() + 3600000).toISOString();
        return this.aiTools.createReminder(userId, { ...input, triggerTime });
      },
    });

    this.register({
      id: 'get_phone_notifications',
      name: 'Get Phone Notifications',
      category: 'NOTIFICATIONS',
      description: 'Retrieves actual permitted notifications received from paired Android device.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { limit: 'number', appName: 'string' },
      execute: async (userId, input) => {
        return this.prisma.mobileEvent.findMany({
          where: {
            userId,
            ...(input?.appName ? { sourceApp: { contains: input.appName, mode: 'insensitive' } } : {}),
          },
          orderBy: { occurredAt: 'desc' },
          take: input?.limit ?? 10,
        });
      },
    });

    this.register({
      id: 'get_in_app_notifications',
      name: 'Get In-App Notifications',
      category: 'NOTIFICATIONS',
      description: 'Retrieves unread notifications and system follow-ups.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { unreadOnly: 'boolean' },
      execute: async (userId, input) => {
        return this.notificationsService.getNotifications(userId, { unreadOnly: input?.unreadOnly ?? true });
      },
    });

    this.register({
      id: 'get_pending_followups',
      name: 'Get Pending Follow-ups',
      category: 'NOTIFICATIONS',
      description: 'Retrieves routine and overdue task follow-up prompts awaiting user check-in.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.followUpsService.getPendingFollowUps(userId),
    });

    // ====================================================
    // L. SETTINGS & APPLICATION CUSTOMIZATION
    // ====================================================
    this.register({
      id: 'get_current_settings',
      name: 'Get Current Settings',
      category: 'SETTINGS',
      description: 'Retrieves user settings, quiet hours, and work preferences.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.settingsService.getSettings(userId),
    });

    this.register({
      id: 'update_user_settings',
      name: 'Update User Settings',
      category: 'SETTINGS',
      description: 'Updates work hours, buffer minutes, or notification preferences.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { quietHoursStart: 'number', quietHoursEnd: 'number', workStartHour: 'number', workEndHour: 'number' },
      execute: async (userId, input) => this.settingsService.updateSettings(userId, input),
    });

    this.register({
      id: 'get_dashboard_layout',
      name: 'Get Dashboard Layout',
      category: 'APPLICATION_CUSTOMIZATION',
      description: 'Retrieves current theme, widget order, density, and visibility.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.aiCustomization.getLayoutConfig(userId),
    });

    this.register({
      id: 'customize_dashboard_layout',
      name: 'Customize Dashboard Layout',
      category: 'APPLICATION_CUSTOMIZATION',
      description: 'Updates dashboard theme (dark/light), density, assistant name, or widget order.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: {
        theme: 'dark|light|system',
        density: 'compact|comfortable|spacious',
        assistantName: 'string',
        widgetOrder: 'array',
        hiddenWidgets: 'array',
      },
      execute: async (userId, input) => this.aiCustomization.updateLayoutConfig(userId, input),
    });

    // ====================================================
    // M. AUTOMATION
    // ====================================================
    this.register({
      id: 'get_automation_rules',
      name: 'Get Automation Rules',
      category: 'AUTOMATION',
      description: 'Retrieves all active automation trigger rules and execution counts.',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: {},
      execute: async (userId) => this.automationService.getRules(userId),
    });

    this.register({
      id: 'toggle_automation_rule',
      name: 'Toggle Automation Rule',
      category: 'AUTOMATION',
      description: 'Enables or disables a specific autonomous monitoring rule.',
      riskLevel: 'MEDIUM',
      requiresConfirmation: true,
      inputSchema: { ruleId: 'string', isEnabled: 'boolean' },
      execute: async (userId, input) => {
        if (!input.ruleId) throw new BadRequestException('ruleId is required');
        return this.automationService.toggleRule(userId, input.ruleId, input.isEnabled);
      },
    });

    // ====================================================
    // N. CLIENT NAVIGATION & UI CONTROL
    // ====================================================
    this.register({
      id: 'navigate_to_tab',
      name: 'Navigate to Workspace Tab',
      category: 'CLIENT_NAVIGATION',
      description: 'Switches the user screen to an authorized workspace tab (e.g. finance, focus, projects).',
      riskLevel: 'LOW',
      requiresConfirmation: false,
      inputSchema: { tab: 'string' },
      execute: async (userId, input) => {
        const allowedTabs = [
          'dashboard', 'my-day', 'work', 'projects', 'routines', 'planning',
          'calendar', 'emergency', 'ai-chat', 'focus', 'goals', 'knowledge',
          'finance', 'life-balance', 'timeline', 'predictive', 'smart-planner',
          'wellness', 'analytics', 'usage-analytics', 'automation', 'settings',
        ];
        const targetTab = (input.tab || '').toLowerCase().trim();
        if (!allowedTabs.includes(targetTab)) {
          throw new BadRequestException(`Tab "${input.tab}" is not a recognized workspace.`);
        }
        return {
          clientAction: 'NAVIGATE_TAB',
          targetTab,
          message: `Navigating to ${targetTab} workspace.`,
        };
      },
    });
  }

  register(tool: JarvisToolDefinition) {
    this.tools.set(tool.id, tool);
  }

  getTool(id: string): JarvisToolDefinition | undefined {
    return this.tools.get(id);
  }

  getAllTools(): JarvisToolDefinition[] {
    return Array.from(this.tools.values());
  }

  async executeTool(userId: string, toolId: string, input: any): Promise<any> {
    const tool = this.getTool(toolId);
    if (!tool) throw new NotFoundException(`Tool "${toolId}" is not registered in JARVIS engine.`);

    const stepIdempotencyKey = input?.stepIdempotencyKey;
    const fencingVersion = input?.fencingVersion;
    const workflowId = input?.workflowId;

    // Fail-Closed Validation for Workflow Fencing at Outer Boundary:
    if (workflowId !== undefined || fencingVersion !== undefined) {
      if (!workflowId || fencingVersion === undefined) {
        throw new BadRequestException('Fail-closed: Both workflowId and fencingVersion must be provided for fenced execution.');
      }
      if (this.prisma.isConnected) {
        const activeWf = await this.prisma.aIAction.findUnique({
          where: { id: workflowId },
          select: { payload: true, status: true },
        });
        if (!activeWf) {
          throw new NotFoundException(`Fail-closed: Authoritative workflow ${workflowId} not found.`);
        }
        if (activeWf.status !== 'RUNNING') {
          throw new ForbiddenException(`Fail-closed: Workflow status "${activeWf.status}" does not permit step mutation (Expected: RUNNING).`);
        }
        const activeLease = (activeWf?.payload as any)?.lease;
        if (!activeLease || activeLease.fencingVersion === undefined) {
          throw new ForbiddenException(`Fail-closed: Workflow ${workflowId} lacks an active authoritative lease or fencing version.`);
        }
        if (activeLease.leaseExpiresAt && new Date(activeLease.leaseExpiresAt).getTime() < Date.now()) {
          this.logger.error(`[WorkerFencing] Workflow lease expired at ${activeLease.leaseExpiresAt}`);
          throw new ForbiddenException(`Fail-closed: Workflow lease expired at ${activeLease.leaseExpiresAt}. Mutation rejected.`);
        }
        if (activeLease.fencingVersion !== fencingVersion) {
          this.logger.error(`[WorkerFencing] Fencing version mismatch (worker holds: ${fencingVersion}, database active: ${activeLease.fencingVersion})`);
          throw new ForbiddenException(`Fencing version mismatch: worker holds ${fencingVersion}, active is ${activeLease.fencingVersion}. Mutation rejected.`);
        }
      }
    }

    // P0-A Atomic Domain Idempotency Claim with Ownership Token & Lease Timeout:
    const CLAIM_TIMEOUT_MS = 15000; // 15 seconds abandoned claim lease timeout
    let activeClaimToken: string | null = null;

    if (stepIdempotencyKey) {
      if (!this.prisma.isConnected) {
        throw new BadRequestException(`Database is currently unavailable. Mutation with idempotency key "${stepIdempotencyKey}" rejected to prevent inconsistent domain writes.`);
      }

      // Check if step has already executed and returned a durable result or has an active/abandoned claim
      const existingRecord = await this.prisma.aIAction.findUnique({
        where: { idempotencyKey: stepIdempotencyKey },
      });

      if (existingRecord) {
        // Strict Tenant/User Isolation check on idempotency record
        if (existingRecord.userId !== userId) {
          throw new ForbiddenException(`Tenant violation: Idempotency key belongs to another user.`);
        }

        if (existingRecord.status === 'EXECUTED' && existingRecord.payload) {
          const payloadData = existingRecord.payload as any;
          this.logger.log(`[JARVIS Idempotency] Reusing existing persisted domain entity for key: ${stepIdempotencyKey} (Tool: ${toolId})`);
          return {
            toolId,
            success: true,
            data: payloadData.result,
            latencyMs: 1,
            cachedFromIdempotency: true,
          };
        }

        if (existingRecord.status !== 'PENDING') {
          // Any status other than PENDING or EXECUTED (e.g. CANCELLED, FAILED, COMPENSATING) is terminal/non-executable
          this.logger.error(`[JARVIS Idempotency] Key ${stepIdempotencyKey} has non-executable status: "${existingRecord.status}"`);
          throw new ForbiddenException(`Idempotency claim has non-executable status "${existingRecord.status}". Mutation rejected.`);
        }

        const payloadData = (existingRecord.payload as any) || {};
          const claimedTime = payloadData.claimedAt ? new Date(payloadData.claimedAt).getTime() : existingRecord.createdAt.getTime();
          const claimAge = Date.now() - claimedTime;

          if (claimAge < CLAIM_TIMEOUT_MS) {
            // Concurrent worker currently executing this step: wait and poll for up to remaining lease time (max 10s)
            this.logger.log(`[JARVIS Idempotency] Active claim detected for key: ${stepIdempotencyKey} (Age: ${claimAge}ms). Polling for completion...`);
            const pollStart = Date.now();
            while (Date.now() - pollStart < 10000) {
              await new Promise((r) => setTimeout(r, 200));
              const fresh = await this.prisma.aIAction.findUnique({ where: { idempotencyKey: stepIdempotencyKey } });
              if (fresh?.status === 'EXECUTED' && fresh?.payload) {
                return {
                  toolId,
                  success: true,
                  data: (fresh.payload as any).result,
                  latencyMs: Date.now() - pollStart,
                  cachedFromIdempotency: true,
                };
              }
            }
            // Check if became executed after polling
            const postPoll = await this.prisma.aIAction.findUnique({ where: { idempotencyKey: stepIdempotencyKey } });
            if (postPoll?.status === 'EXECUTED' && postPoll?.payload) {
              return {
                toolId,
                success: true,
                data: (postPoll.payload as any).result,
                latencyMs: Date.now() - pollStart,
                cachedFromIdempotency: true,
              };
            }
          }

          // If claim expired or poll finished without completion: atomic conditional reclaim
          const newClaimToken = randomUUID();
          this.logger.warn(`[JARVIS Idempotency] Abandoned PENDING claim lease expired for key: ${stepIdempotencyKey} (Age: ${claimAge}ms). Attempting atomic CAS reclaim...`);
          
          const existingToken = payloadData.claimToken;
          let reclaimCount = 0;

          if (existingToken) {
            const reclaimResult = await this.prisma.aIAction.updateMany({
              where: {
                idempotencyKey: stepIdempotencyKey,
                status: 'PENDING',
                payload: {
                  path: ['claimToken'],
                  equals: existingToken,
                },
              },
              data: {
                payload: {
                  toolId,
                  status: 'RECLAIMED',
                  claimToken: newClaimToken,
                  reclaimedAt: new Date().toISOString(),
                  claimedAt: new Date().toISOString(),
                },
              },
            });
            reclaimCount = reclaimResult.count;
          } else {
            const reclaimResult = await this.prisma.aIAction.updateMany({
              where: {
                idempotencyKey: stepIdempotencyKey,
                status: 'PENDING',
              },
              data: {
                payload: {
                  toolId,
                  status: 'RECLAIMED',
                  claimToken: newClaimToken,
                  reclaimedAt: new Date().toISOString(),
                  claimedAt: new Date().toISOString(),
                },
              },
            });
            reclaimCount = reclaimResult.count;
          }

          if (reclaimCount > 0) {
            activeClaimToken = newClaimToken;
            this.logger.log(`[JARVIS Idempotency] Successfully reclaimed claim slot with token ${newClaimToken}`);
          } else {
            this.logger.warn(`[JARVIS Idempotency] Reclaim race lost for key: ${stepIdempotencyKey}. Polling winner's result...`);
            const pollStart = Date.now();
            while (Date.now() - pollStart < 10000) {
              await new Promise((r) => setTimeout(r, 200));
              const fresh = await this.prisma.aIAction.findUnique({ where: { idempotencyKey: stepIdempotencyKey } });
              if (fresh?.status === 'EXECUTED' && fresh?.payload) {
                return {
                  toolId,
                  success: true,
                  data: (fresh.payload as any).result,
                  latencyMs: Date.now() - pollStart,
                  cachedFromIdempotency: true,
                };
              }
            }
          }
        }
      } else {
        // Atomically claim the idempotency slot with PENDING status and unique claimToken
        const newClaimToken = randomUUID();
        try {
          await this.prisma.aIAction.create({
            data: {
              userId,
              actionType: 'DOMAIN_STEP_IDEMPOTENCY',
              description: `Atomic claim for step ${toolId}`,
              status: 'PENDING',
              idempotencyKey: stepIdempotencyKey,
              payload: { toolId, status: 'CLAIMED', claimToken: newClaimToken, claimedAt: new Date().toISOString() },
            },
          });
          activeClaimToken = newClaimToken;
        } catch (claimErr: any) {
          // If Prisma unique constraint P2002 throws, another worker claimed the slot concurrently
          if (claimErr?.code === 'P2002') {
            this.logger.warn(`[JARVIS Idempotency] Atomic claim race lost for key: ${stepIdempotencyKey}. Polling winner's result...`);
            const pollStart = Date.now();
            while (Date.now() - pollStart < 10000) {
              await new Promise((r) => setTimeout(r, 200));
              const fresh = await this.prisma.aIAction.findUnique({ where: { idempotencyKey: stepIdempotencyKey } });
              if (fresh?.status === 'EXECUTED' && fresh?.payload) {
                return {
                  toolId,
                  success: true,
                  data: (fresh.payload as any).result,
                  latencyMs: Date.now() - pollStart,
                  cachedFromIdempotency: true,
                };
              }
            }
          }
        }
      }

    const start = Date.now();
    try {
      this.logger.log(`[JARVIS Tool Exec] User ${userId} invoking tool "${toolId}" (Risk: ${tool.riskLevel})`);
      
      // P0-A/P0-B: Transactional execution for Postgres Domain Mutations
      let result: any;
      const targetMutations = ['create_project', 'create_task', 'create_routine', 'create_knowledge_note', 'create_transaction_entry'];
      const isTransactionalTarget = targetMutations.includes(toolId) && stepIdempotencyKey && this.prisma.isConnected;

      if (isTransactionalTarget) {
        result = await this.prisma.$transaction(async (tx) => {
          // 1. Mandatory Workflow Existence and Database-Boundary Fencing Validation:
          if (workflowId !== undefined || fencingVersion !== undefined) {
            // Both must be provided if either is specified
            if (!workflowId || fencingVersion === undefined) {
              throw new BadRequestException('Fail-closed: Both workflowId and fencingVersion must be provided for fenced execution.');
            }

            const lockedRows: any[] = await tx.$queryRawUnsafe(
              'SELECT id, status, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE',
              workflowId,
            );
            if (!lockedRows || lockedRows.length === 0) {
              throw new NotFoundException(`Fail-closed: Authoritative workflow ${workflowId} not found in database.`);
            }
            const lockedWf = lockedRows[0];
            
            // Permitted execution status check
            if (lockedWf.status !== 'RUNNING') {
              throw new ForbiddenException(`Fail-closed: Workflow status "${lockedWf.status}" does not permit step mutation (Expected: RUNNING).`);
            }

            const activeLease = (lockedWf.payload as any)?.lease;
            if (!activeLease || activeLease.fencingVersion === undefined) {
              throw new ForbiddenException(`Fail-closed: Workflow ${workflowId} lacks an active authoritative lease or fencing version.`);
            }

            // Expiration check on workflow lease
            if (activeLease.leaseExpiresAt && new Date(activeLease.leaseExpiresAt).getTime() < Date.now()) {
              throw new ForbiddenException(`Fail-closed: Workflow lease expired at ${activeLease.leaseExpiresAt}.`);
            }

            // Monotonic strict fencing check
            if (activeLease.fencingVersion !== fencingVersion) {
              this.logger.error(`[WorkerFencing RowLock] Fencing version mismatch (worker holds: ${fencingVersion}, database active: ${activeLease.fencingVersion})`);
              throw new ForbiddenException(`Fencing version mismatch: worker holds ${fencingVersion}, active is ${activeLease.fencingVersion}. Mutation rejected.`);
            }
          }

          // 2. Mandatory Claim Ownership Fail-Closed Verification inside Transaction:
          if (stepIdempotencyKey) {
            if (!activeClaimToken) {
              throw new ForbiddenException(`Fail-closed: Active claim token is required to execute transactional mutation for key "${stepIdempotencyKey}".`);
            }

            const currentClaimRows: any[] = await tx.$queryRawUnsafe(
              'SELECT id, status, payload FROM "ai_actions" WHERE "idempotencyKey" = $1 FOR UPDATE',
              stepIdempotencyKey,
            );
            if (!currentClaimRows || currentClaimRows.length === 0) {
              throw new NotFoundException(`Fail-closed: Idempotency claim record for "${stepIdempotencyKey}" not found under lock.`);
            }

            const currentClaim = currentClaimRows[0];
            if (currentClaim.status !== 'PENDING') {
              throw new ForbiddenException(`Fail-closed: Claim status is "${currentClaim.status}", expected executable status "PENDING".`);
            }

            const claimPayload = (currentClaim.payload as any) || {};
            const tokenInDb = claimPayload.claimToken;
            if (!tokenInDb || tokenInDb !== activeClaimToken) {
              this.logger.error(`[ClaimOwnership Tx] Stale claim owner rejected. Current in DB: ${tokenInDb}, worker holds: ${activeClaimToken}`);
              throw new ForbiddenException(`Claim ownership expired or reclaimed by another worker. Mutation rejected.`);
            }

            // Verify claim lease expiration fail-closed
            const claimedTime = claimPayload.claimedAt ? new Date(claimPayload.claimedAt).getTime() : 0;
            if (claimedTime > 0 && (Date.now() - claimedTime > CLAIM_TIMEOUT_MS)) {
              throw new ForbiddenException(`Fail-closed: Claim lease expired before transaction execution.`);
            }
          }

          // 3. Perform the domain mutation inside transaction
          let domainResult: any;
          if (toolId === 'create_project') {
            if (!input.title && !input.name) throw new BadRequestException('Project title is required');
            const project = await tx.project.create({
              data: {
                userId,
                title: input.title || input.name || 'New Strategic Project',
                description: input.description,
                color: input.color || '#8B45F5',
                targetDate: input.targetDate ? new Date(input.targetDate) : null,
              },
            });
            domainResult = {
              ...project,
              tasksCount: 0,
              completedTasksCount: 0,
              progressPercent: 0,
              createdAt: project.createdAt.toISOString(),
              updatedAt: project.updatedAt.toISOString(),
              targetDate: project.targetDate ? project.targetDate.toISOString() : null,
            };
          } else if (toolId === 'create_task') {
            if (!input.title) throw new BadRequestException('Task title is required');
            const task = await tx.task.create({
              data: {
                userId,
                title: input.title,
                description: input.description,
                category: (input.category as any) || 'WORK',
                status: (input.status as any) || 'TODO',
                priority: (input.priority as any) || 'MEDIUM',
                schedulingMode: (input.schedulingMode as any) || 'FLEXIBLE',
                estimatedDurationMinutes: input.estimatedDurationMinutes || 30,
                scheduledStartTime: input.scheduledStartTime ? new Date(input.scheduledStartTime) : null,
                scheduledEndTime: input.scheduledEndTime ? new Date(input.scheduledEndTime) : null,
                earliestStartTime: input.earliestStartTime ? new Date(input.earliestStartTime) : null,
                deadline: input.deadline ? new Date(input.deadline) : null,
                projectId: input.projectId || null,
                parentTaskId: input.parentTaskId || null,
              },
            });
            await tx.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'CREATED',
                newStatus: task.status,
              },
            });
            domainResult = { ...task, isOverdue: false };
          } else if (toolId === 'create_routine') {
            if (!input.title) throw new BadRequestException('Routine title is required');
            const routine = await tx.routine.create({
              data: {
                userId,
                title: input.title,
                description: input.description,
                frequency: (input.frequency as any) || 'DAILY',
                customDays: input.customDays || [],
                targetTime: input.targetTime || '09:00',
                durationMinutes: input.durationMinutes || 15,
                targetQuantity: input.targetQuantity || 1,
                isActive: true,
              },
            });
            domainResult = routine;
          } else if (toolId === 'create_knowledge_note') {
            if (!input.title) throw new BadRequestException('Note title is required');
            const note = await tx.knowledgeNote.create({
              data: {
                userId,
                title: input.title,
                content: input.content || '',
                category: (input.category as any) || 'NOTE',
                folderId: input.folderId || null,
                projectId: input.projectId || null,
              },
            });
            await tx.knowledgeVersion.create({
              data: {
                noteId: note.id,
                title: note.title,
                content: note.content,
                versionNumber: 1,
                changeSummary: 'Initial creation',
              },
            });
            domainResult = note;
          } else if (toolId === 'create_transaction_entry') {
            if (!input.accountId || !input.amount || !input.type) {
              throw new BadRequestException('accountId, amount, and type are required');
            }
            const account = await tx.financeAccount.findFirst({
              where: { id: input.accountId, userId },
            });
            if (!account) throw new NotFoundException(`Account ${input.accountId} not found`);

            const { Prisma } = await import('@prisma/client');
            const amountDecimal = new Prisma.Decimal(input.amount);
            const transaction = await tx.financeTransaction.create({
              data: {
                userId,
                accountId: input.accountId,
                categoryId: input.categoryId || null,
                type: input.type,
                amount: amountDecimal,
                currency: input.currency || account.currency || 'INR',
                date: input.date || new Date().toISOString(),
                description: input.description || 'Logged via Assistant',
                paymentMethod: input.paymentMethod || 'OTHER',
              },
            });

            let newBalance = account.balance;
            if (input.type === 'INCOME') {
              newBalance = newBalance.add(amountDecimal);
            } else if (input.type === 'EXPENSE') {
              newBalance = newBalance.sub(amountDecimal);
            }

            await tx.financeAccount.update({
              where: { id: account.id },
              data: { balance: newBalance },
            });
            domainResult = transaction;
          }

          // 3. Atomically persist idempotency record inside the SAME database transaction
          await tx.aIAction.upsert({
            where: { idempotencyKey: stepIdempotencyKey },
            update: {
              status: 'EXECUTED',
              payload: {
                toolId,
                result: domainResult,
                timestamp: new Date().toISOString(),
              },
              executedAt: new Date(),
            },
            create: {
              userId,
              actionType: 'DOMAIN_STEP_IDEMPOTENCY',
              description: `Domain execution result for ${toolId}`,
              status: 'EXECUTED',
              idempotencyKey: stepIdempotencyKey,
              payload: {
                toolId,
                result: domainResult,
                timestamp: new Date().toISOString(),
              },
              executedAt: new Date(),
            },
          });

          return domainResult;
        }, {
          timeout: 15000,
          maxWait: 5000,
        });
      } else {
        // Standard tool execution (read tools or non-targeted mutations)
        result = await tool.execute(userId, input);

        // Domain Idempotency for other tools: Mark slot EXECUTED with result payload
        if (stepIdempotencyKey && this.prisma.isConnected && result) {
          try {
            await this.prisma.aIAction.upsert({
              where: { idempotencyKey: stepIdempotencyKey },
              update: {
                status: 'EXECUTED',
                payload: {
                  toolId,
                  result,
                  timestamp: new Date().toISOString(),
                },
                executedAt: new Date(),
              },
              create: {
                userId,
                actionType: 'DOMAIN_STEP_IDEMPOTENCY',
                description: `Domain execution result for ${toolId}`,
                status: 'EXECUTED',
                idempotencyKey: stepIdempotencyKey,
                payload: {
                  toolId,
                  result,
                  timestamp: new Date().toISOString(),
                },
                executedAt: new Date(),
              },
            });
          } catch (idemErr: any) {
            this.logger.error(`[JARVIS Idempotency Store Error] Failed to persist idempotency key ${stepIdempotencyKey}: ${idemErr?.message}`);
          }
        }
      }

      const elapsed = Date.now() - start;
      return {
        toolId,
        success: true,
        data: result,
        latencyMs: elapsed,
      };
    } catch (err: any) {
      this.logger.error(`[JARVIS Tool Exec Error] Tool "${toolId}" failed: ${err?.message}`);

      // If execution failed and error occurred outside a clean rollback, clean up abandoned PENDING claim
      if (stepIdempotencyKey && this.prisma.isConnected) {
        try {
          await this.prisma.aIAction.deleteMany({
            where: { idempotencyKey: stepIdempotencyKey, status: 'PENDING' },
          });
        } catch (delErr: any) {
          this.logger.warn(`[JARVIS Idempotency] Failed to remove pending claim on failure: ${delErr?.message}`);
        }
      }

      // Re-throw HTTP / Security / Authorization / Fencing exceptions to fail-closed with canonical status code
      if (err instanceof HttpException) {
        throw err;
      }

      return {
        toolId,
        success: false,
        error: err?.message || 'Execution error',
        latencyMs: Date.now() - start,
      };
    }
  }
}
