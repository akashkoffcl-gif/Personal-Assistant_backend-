import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AIToolsService } from './ai-tools.service';
import { SmartPlannerService } from './smart-planner.service';
import { WorkerService } from '../../worker/worker.service';
import { AIMemoryService } from './ai-memory.service';
import { AIDashboardCustomizationService } from './ai-customization.service';
import { JarvisToolRegistryService } from './jarvis-tool-registry.service';
import { ConversationalIntentService } from './conversational-intent.service';
import { BehaviouralContextService } from './behavioral-context.service';
import { ConversationalPersonalityEngine } from './conversational-personality.service';
import { SendMessageDto, ProviderStatusDto } from './dto/ai.dto';
import { v4 as uuidv4 } from 'uuid';

export type AIRequestCategory =
  | 'GENERAL_CONVERSATION'
  | 'PERSONAL_DATA_RETRIEVAL'
  | 'TASK_QUERY'
  | 'TASK_EXECUTION'
  | 'ROUTINE_QUERY'
  | 'CALENDAR_QUERY'
  | 'FINANCIAL_ANALYSIS'
  | 'PRODUCTIVITY_ANALYSIS'
  | 'FOCUS_MANAGEMENT'
  | 'GOAL_ANALYSIS'
  | 'KNOWLEDGE_SEARCH'
  | 'DAILY_PLANNING'
  | 'REMINDER_MANAGEMENT'
  | 'MULTI_STEP_WORKFLOW'
  | 'VOICE_INTERACTION';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  // Authoritative credential resolution: Prefer dedicated GEMINI_AUTH_KEY, fallback to GEMINI_API_KEY
  private readonly geminiApiKey = (process.env.GEMINI_AUTH_KEY || process.env.GEMINI_API_KEY || '').trim();
  private readonly geminiModel = 'gemini-3.5-flash-lite';

  // Module A: Resilient Concurrency Semaphore & Circuit Breaker State
  private activeConcurrency = 0;
  private readonly maxConcurrency = 5;
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private consecutiveUpstreamFailures = 0;
  private circuitOpenedAt: number | null = null;
  private readonly circuitCooldownMs = 30000; // 30 seconds cooldown before testing recovery

  // AI Operational Metrics Telemetry Storage (In-memory rolling buffer for diagnostics dashboard)
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    groundedFallbackCount: 0,
    directGeminiCount: 0,
    upstreamRateLimitCount: 0, // HTTP 429 / 503 count
    circuitBreakerTrips: 0,
    latencies: [] as number[],
    lastRequestAt: null as string | null,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTools: AIToolsService,
    private readonly smartPlanner: SmartPlannerService,
    private readonly workerService: WorkerService,
    private readonly aiMemory: AIMemoryService,
    private readonly aiCustomization: AIDashboardCustomizationService,
    private readonly jarvisRegistry: JarvisToolRegistryService,
    private readonly intentService: ConversationalIntentService,
    private readonly behaviouralContext: BehaviouralContextService,
    private readonly personalityEngine: ConversationalPersonalityEngine,
  ) { }

  /**
   * AI Operational Diagnostics Telemetry Endpoint
   * Read-only metrics aggregate for administrative observability
   */
  async getOperationalMetrics() {
    const providerStatus = await this.getProviderStatus();
    const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies.length ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : 0;
    const p95 = sortedLatencies.length ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : 0;

    // Database roundtrip latency measurement
    const dbStart = Date.now();
    await this.prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // Check circuit breaker status
    if (this.circuitBreakerState === 'OPEN') {
      if (this.circuitOpenedAt && Date.now() - this.circuitOpenedAt > this.circuitCooldownMs) {
        this.circuitBreakerState = 'HALF_OPEN';
        this.logger.log('Circuit breaker entered HALF_OPEN state; testing upstream recovery.');
      }
    }

    return {
      providerStatus,
      circuitBreaker: {
        state: this.circuitBreakerState,
        consecutiveFailures: this.consecutiveUpstreamFailures,
        activeConcurrency: this.activeConcurrency,
        maxConcurrency: this.maxConcurrency,
        circuitOpenedAt: this.circuitOpenedAt ? new Date(this.circuitOpenedAt).toISOString() : null,
      },
      telemetry: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        groundedFallbackCount: this.metrics.groundedFallbackCount,
        directGeminiCount: this.metrics.directGeminiCount,
        upstreamRateLimitCount: this.metrics.upstreamRateLimitCount,
        circuitBreakerTrips: this.metrics.circuitBreakerTrips,
        p50LatencyMs: p50,
        p95LatencyMs: p95,
        databaseQueryLatencyMs: dbLatency,
        lastRequestAt: this.metrics.lastRequestAt,
      },
      workerQueue: {
        queueName: 'ai-workflows-queue',
        status: 'CONNECTED',
      },
      timestamp: new Date().toISOString(),
    };
  }

  recordMetric(latencyMs: number, source: 'GROUNDED_FALLBACK' | 'DEVELOPER_API_KEY', success = true) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    if (source === 'GROUNDED_FALLBACK') {
      this.metrics.groundedFallbackCount++;
    } else {
      this.metrics.directGeminiCount++;
    }
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 500) {
      this.metrics.latencies.shift();
    }
    this.metrics.lastRequestAt = new Date().toISOString();
  }

  /**
   * Explicit AI Provider Status Inspector
   */
  async getProviderStatus(overrideKey?: string): Promise<ProviderStatusDto> {
    const key = (overrideKey || this.geminiApiKey || '').trim();
    if (!key) {
      return {
        status: 'NOT_CONFIGURED',
        model: this.geminiModel,
        source: 'GROUNDED_FALLBACK',
        message: 'No GEMINI_AUTH_KEY or GEMINI_API_KEY configured. Assistant operates in grounded local intelligence mode.',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Use documented x-goog-api-key header and supported active model
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          signal: AbortSignal.timeout(7000),
        },
      );
      if (res.ok) {
        return {
          status: 'CONNECTED',
          model: this.geminiModel,
          source: 'DEVELOPER_API_KEY',
          message: `Google Gemini (${this.geminiModel}) is verified connected and healthy.`,
          timestamp: new Date().toISOString(),
        };
      }
      if (res.status === 401 || res.status === 403) {
        let errDetail = '';
        try {
          const errJson = await res.json();
          errDetail = errJson?.error?.message ? ` (${errJson.error.message})` : '';
        } catch (_) { }
        return {
          status: 'INVALID_CREDENTIAL',
          model: this.geminiModel,
          source: 'GROUNDED_FALLBACK',
          message: `Gemini API authentication failed: HTTP ${res.status}${errDetail}. Operating in grounded local intelligence mode.`,
          timestamp: new Date().toISOString(),
        };
      }
      if (res.status === 429) {
        return {
          status: 'QUOTA_EXCEEDED',
          model: this.geminiModel,
          source: 'GROUNDED_FALLBACK',
          message: 'Gemini API quota exceeded. Falling back to local grounded intelligence.',
          timestamp: new Date().toISOString(),
        };
      }
      return {
        status: 'UNAVAILABLE',
        model: this.geminiModel,
        source: 'GROUNDED_FALLBACK',
        message: `Gemini API returned status ${res.status}. Falling back to local grounded intelligence.`,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
      return {
        status: isTimeout ? 'TIMEOUT' : 'UNAVAILABLE',
        model: this.geminiModel,
        source: 'GROUNDED_FALLBACK',
        message: `Gemini API probe failed (${err?.message || 'Network error'}). Operating in grounded local intelligence mode.`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Request Classifier / Intelligent Router
 * Distinguishes all 14 domain intent categories
 */
  classifyRequest(userMessage: string): AIRequestCategory {
    const lower = userMessage.toLowerCase();

    // 14. Multi-step workflow intents
    if (
      lower.includes('reorganize my entire day') ||
      lower.includes('re-index knowledge') ||
      lower.includes('bulk reschedule') ||
      lower.includes('autonomous workflow') ||
      lower.includes('rebuild plan')
    ) {
      return 'MULTI_STEP_WORKFLOW';
    }

    // 13. Reminder Management
    if (lower.includes('reminder') || lower.includes('remind me') || lower.includes('alert me')) {
      return 'REMINDER_MANAGEMENT';
    }

    // 4. Task Execution mutations
    if (
      lower.includes('create task') ||
      lower.includes('add task') ||
      lower.includes('complete task') ||
      lower.includes('delete task')
    ) {
      return 'TASK_EXECUTION';
    }

    // 9. Focus Management
    if (lower.includes('start focus') || lower.includes('deep work') || lower.includes('pomodoro') || lower.includes('focus timer')) {
      return 'FOCUS_MANAGEMENT';
    }

    // 3. Task Queries (Today's tasks, overdue tasks, priority tasks)
    if (
      lower.includes('what tasks') ||
      lower.includes('my tasks') ||
      lower.includes('overdue') ||
      lower.includes('task list') ||
      lower.includes('pending tasks') ||
      lower.includes('what should i prioritize') ||
      lower.includes('priority')
    ) {
      return 'TASK_QUERY';
    }

    // 5. Routine Query
    if (lower.includes('routine') || lower.includes('habit') || lower.includes('habits')) {
      return 'ROUTINE_QUERY';
    }

    // 6. Calendar & Schedule Query
    if (lower.includes('calendar') || lower.includes('agenda') || lower.includes('schedule') || lower.includes('timeline')) {
      return 'CALENDAR_QUERY';
    }

    // 12. Daily Planning
    if (
      lower.includes('plan my day') ||
      lower.includes('what should i focus on') ||
      lower.includes('summarize my day') ||
      lower.includes('start my day') ||
      lower.includes('brief me') ||
      lower.includes('briefing')
    ) {
      return 'DAILY_PLANNING';
    }

    // 7. Financial Analysis
    if (
      lower.includes('spend') ||
      lower.includes('spent') ||
      lower.includes('budget') ||
      lower.includes('net worth') ||
      lower.includes('finance') ||
      lower.includes('money') ||
      lower.includes('savings')
    ) {
      return 'FINANCIAL_ANALYSIS';
    }

    // 8. Productivity Analysis
    if (
      lower.includes('productive') ||
      lower.includes('productivity') ||
      lower.includes('score') ||
      lower.includes('velocity') ||
      lower.includes('performance') ||
      lower.includes('how am i doing') ||
      lower.includes('progress')
    ) {
      return 'PRODUCTIVITY_ANALYSIS';
    }

    // 10. Goal Analysis
    if (lower.includes('goal') || lower.includes('milestone') || lower.includes('target') || lower.includes('okr')) {
      return 'GOAL_ANALYSIS';
    }

    // 11. Knowledge Search
    if (
      lower.includes('note') ||
      lower.includes('notes') ||
      lower.includes('idea') ||
      lower.includes('ideas') ||
      lower.includes('knowledge') ||
      lower.includes('research') ||
      lower.includes('second brain')
    ) {
      return 'KNOWLEDGE_SEARCH';
    }

    // 2. Personal Data Retrieval
    if (lower.includes('my data') || lower.includes('workspace') || lower.includes('summary')) {
      return 'PERSONAL_DATA_RETRIEVAL';
    }

    // 1. General Conversation
    return 'GENERAL_CONVERSATION';
  }

  async chat(userId: string, dto: SendMessageDto) {
    const startTime = Date.now();

    // 1. Get or create conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conv = await this.prisma.aIConversation.create({
        data: {
          userId,
          title: dto.message.slice(0, 40) + '...',
        },
      });
      conversationId = conv.id;
    }

    // 2. Fetch Recent Conversation History for Context & Pronoun Resolution (bounded to last 6 messages)
    const recentMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    const chronologicalHistory = recentMessages.reverse().map((m) => ({
      role: m.role.toLowerCase() === 'user' ? 'user' : 'model',
      content: m.content,
    }));

    // 3. Deep Natural Language Understanding & Intent Analysis
    const intentAnalysis = this.intentService.analyzeIntent(
      dto.message,
      chronologicalHistory,
      dto.uiContext,
    );

    // 4. Save user message to database
    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        userId,
        role: 'USER',
        content: dto.message,
      },
    });

    // 5. Gather User Behaviour Profile & Ranked Contextual Memories
    const userProfile = await this.behaviouralContext.getUserProfile(userId);
    const rankedMemories = await this.behaviouralContext.getRankedContextMemories(userId, dto.message, 4);

    // 6. Proactive tool discovery & selective context enrichment
    // Gate tool execution: do not trigger heavy tools if decision policy is purely conversational or venting
    let toolContext = { toolUsed: null as string | null, toolData: null as any };
    if (intentAnalysis.decisionPolicy !== 'DIRECT_ANSWER' || intentAnalysis.actionRequired) {
      toolContext = await this.gatherContextForPrompt(userId, dto.message);
    }

    // 7. Conversational Personality Directives Generation
    const personalityDirectives = this.personalityEngine.generateStyleDirectives(
      intentAnalysis,
      userProfile,
      dto.assistantName || 'Nova',
    );

    // 8. Call Google Gemini or Grounded Fallback with Context & Multi-turn History
    const effectiveKey = dto.geminiApiKey || this.geminiApiKey;
    const { replyText, proposedAction, providerStatus, clientAction, tab } = await this.callGemini(
      userId,
      dto.message,
      toolContext,
      dto.assistantName,
      effectiveKey,
      dto.uiContext,
      chronologicalHistory,
      intentAnalysis,
      rankedMemories,
      personalityDirectives,
    );

    // 9. Save assistant message
    const assistantMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        userId,
        role: 'ASSISTANT',
        content: replyText,
        toolCalls: toolContext.toolUsed ? { tool: toolContext.toolUsed } : undefined,
        toolResults: toolContext.toolData ? JSON.parse(JSON.stringify(toolContext.toolData)) : undefined,
      },
    });

    // 10. If an action was proposed AND policy permits, save to AIAction with PROPOSED status
    let savedAction = null;
    if (proposedAction && intentAnalysis.actionRequired) {
      savedAction = await this.prisma.aIAction.create({
        data: {
          userId,
          actionType: proposedAction.type,
          description: proposedAction.description,
          payload: proposedAction.payload,
          status: 'PROPOSED',
          idempotencyKey: uuidv4(),
        },
      });

      // If category is MULTI_STEP_WORKFLOW, enqueue to BullMQ queue automatically
      if (intentAnalysis.decisionPolicy === 'PLAN') {
        await this.workerService.queueAiWorkflow(userId, savedAction.id, proposedAction.type, proposedAction.payload);
      }
    }

    // Update conversation updatedAt
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const elapsed = Date.now() - startTime;
    this.recordMetric(
      elapsed,
      (providerStatus?.source as 'GROUNDED_FALLBACK' | 'DEVELOPER_API_KEY') || 'GROUNDED_FALLBACK',
      true,
    );

    return {
      conversationId,
      message: assistantMessage,
      toolUsed: toolContext.toolUsed,
      proposedAction: savedAction,
      providerStatus,
      intentAnalysis,
      pacing: personalityDirectives.speechPacingHint,
      latencyMs: elapsed,
      clientAction,
      tab,
    };
  }

  async getConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
  }

  async getConversationById(userId: string, conversationId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);
    return conv;
  }

  async renameConversation(userId: string, conversationId: string, title: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);

    return this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conv = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);

    // Delete associated messages first
    await this.prisma.aIMessage.deleteMany({
      where: { conversationId },
    });

    await this.prisma.aIConversation.delete({
      where: { id: conversationId },
    });

    return { success: true };
  }

  async executeAction(userId: string, actionId: string, confirmed: boolean) {
    // P0 Security: Enforce strict ownership, conversation context, approval, and idempotency
    const action = await this.prisma.aIAction.findFirst({
      where: { id: actionId, userId },
    });
    if (!action) throw new NotFoundException(`Action ${actionId} not found or unauthorized`);

    // 1. Idempotency Check: Already executed, rejected, or cancelled actions cannot be re-executed
    if (action.status === 'EXECUTED') {
      throw new BadRequestException(`Action ${actionId} has already been executed`);
    }
    if (action.status === 'REJECTED' || action.status === 'CANCELLED') {
      throw new BadRequestException(`Action ${actionId} was previously ${action.status.toLowerCase()} and cannot be executed`);
    }

    // 2. Normalized toolId determination
    const rawType = action.actionType;
    let toolId = rawType.toLowerCase();

    // Map common legacy action types to unified tool identifiers
    const legacyMap: Record<string, string> = {
      create_task: 'create_task',
      complete_task: 'complete_task',
      delete_task: 'delete_task',
      update_task: 'update_task',
      reschedule_task: 'reschedule_task',
      create_reminder: 'create_reminder',
      start_focus: 'start_focus_session',
      finish_focus: 'finish_focus_session',
      create_goal: 'create_goal',
      create_note: 'create_knowledge_note',
      complete_routine: 'complete_routine',
      apply_day_plan: 'apply_day_plan',
      customize_dashboard: 'customize_dashboard_layout',
      remember_preference: 'remember_preference',
      forget_memory: 'forget_memory',
      create_project: 'create_project',
      report_emergency: 'report_emergency',
      navigate_tab: 'navigate_to_tab',
    };

    if (legacyMap[toolId]) {
      toolId = legacyMap[toolId];
    }

    const payload = (action.payload as any) || {};

    // 3. Verify tool registration in unified registry
    const tool = this.jarvisRegistry.getTool(toolId);
    if (!tool) {
      this.logger.error(`Unified tool "${toolId}" not found for action ${actionId}`);
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(`Tool "${toolId}" is not registered in JARVIS capability registry.`);
    }

    // 4. Enforce High-Risk and Confirmation Policy
    if (tool.riskLevel === 'HIGH' && !confirmed) {
      throw new ForbiddenException(`Explicit user confirmation is mandatory for high-risk operation "${tool.name}".`);
    }

    // 5. Explicit user rejection handling
    if (!confirmed) {
      return this.prisma.aIAction.update({
        where: { id: actionId },
        data: { status: 'REJECTED' },
      });
    }

    // 6. Execute exclusively via the unified Jarvis Tool Registry
    try {
      const executionResult = await this.jarvisRegistry.executeTool(userId, toolId, payload);
      if (!executionResult.success) {
        await this.prisma.aIAction.update({
          where: { id: actionId },
          data: { status: 'FAILED' },
        });
        throw new BadRequestException(executionResult.error || `Execution failed for tool ${toolId}`);
      }

      // 7. Atomic state transition to EXECUTED with timestamp
      return await this.prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'EXECUTED',
          executedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Execution error for action ${actionId} (${toolId}): ${err?.message}`);
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  private async gatherContextForPrompt(userId: string, userMessage: string) {
    const lower = userMessage.toLowerCase();
    const today = new Date().toISOString().substring(0, 10);

    // Dynamic Context Grounding: Always fetch persistent personal memories
    const userMemories = await this.aiMemory.getContextualMemoryPrompt(userId);

    // 0. Dashboard Layout & Customization intent
    if (
      lower.includes('dashboard') ||
      lower.includes('layout') ||
      lower.includes('theme') ||
      lower.includes('dark mode') ||
      lower.includes('light mode') ||
      lower.includes('organize my workspace') ||
      lower.includes('compact')
    ) {
      const layout = await this.aiCustomization.getLayoutConfig(userId);
      return { toolUsed: 'get_dashboard_layout', toolData: { layout, userMemories } };
    }

    // 1. Executive Briefing & Daily Planning
    if (
      lower.includes('brief') ||
      lower.includes('morning') ||
      lower.includes('briefing') ||
      lower.includes('start my day') ||
      lower.includes('what should i do') ||
      lower.includes('summarize my day') ||
      lower.includes('what should i focus on') ||
      lower.includes('plan my day')
    ) {
      const data = await this.aiTools.getPersonalBriefing(userId);
      return { toolUsed: 'get_personal_briefing', toolData: { ...data, userMemories } };
    }

    // 2. Focus Studio intent
    if (lower.includes('focus') || lower.includes('deep work') || lower.includes('pomodoro') || lower.includes('timer')) {
      const data = await this.aiTools.getFocusSummary(userId);
      return { toolUsed: 'get_focus_summary', toolData: data };
    }

    // 3. Goal & Milestone intent
    if (lower.includes('goal') || lower.includes('milestone') || lower.includes('target') || lower.includes('quarterly')) {
      const data = await this.aiTools.getGoalsSummary(userId);
      return { toolUsed: 'get_goals_summary', toolData: data };
    }

    // 4. Finance intent (spending, budget, money, net worth)
    if (lower.includes('finance') || lower.includes('budget') || lower.includes('money') || lower.includes('net worth') || lower.includes('spend') || lower.includes('spent') || lower.includes('saving')) {
      const data = await this.aiTools.getFinanceSummary(userId);
      return { toolUsed: 'get_finance_summary', toolData: data };
    }

    // 5. Wellness & Life balance intent
    if (lower.includes('wellness') || lower.includes('habit') || lower.includes('routine') || lower.includes('workout') || lower.includes('water') || lower.includes('health')) {
      const data = await this.aiTools.getLifeBalanceSummary(userId);
      return { toolUsed: 'get_life_balance_summary', toolData: data };
    }

    // 6. Schedule intent (today, calendar, schedule, agenda, overdue, tasks)
    if (
      lower.includes('today') ||
      lower.includes('schedule') ||
      lower.includes('agenda') ||
      lower.includes('meeting') ||
      lower.includes('calendar') ||
      lower.includes('what tasks') ||
      lower.includes('my tasks') ||
      lower.includes('overdue') ||
      lower.includes('task list') ||
      lower.includes('prioritize')
    ) {
      const data = await this.aiTools.getDaySchedule(userId, today);
      return { toolUsed: 'get_day_schedule', toolData: data };
    }

    // 7. Knowledge & notes intent
    if (lower.includes('note') || lower.includes('idea') || lower.includes('knowledge') || lower.includes('second brain') || lower.includes('research')) {
      const data = await this.aiTools.searchKnowledge(userId, userMessage);
      return { toolUsed: 'search_knowledge', toolData: data };
    }

    // 8. Predictive intelligence
    if (lower.includes('predict') || lower.includes('risk') || lower.includes('recommend') || lower.includes('overload')) {
      const data = await this.aiTools.getPredictiveRecommendations(userId);
      return { toolUsed: 'get_predictive_recommendations', toolData: data };
    }

    // 9. Comprehensive Progress & Autonomous Background Analysis
    if (
      lower.includes('progress') ||
      lower.includes('analyze') ||
      lower.includes('status') ||
      lower.includes('how am i doing') ||
      lower.includes('summary') ||
      lower.includes('performance') ||
      lower.includes('productive')
    ) {
      const data = await this.aiTools.getUserProgressAnalysis(userId);
      return { toolUsed: 'get_user_progress_analysis', toolData: data };
    }

    return { toolUsed: null, toolData: null };
  }

  private async callGemini(
    userId: string,
    userMessage: string,
    toolContext: { toolUsed: string | null; toolData: any },
    customAssistantName?: string,
    overrideKey?: string,
    uiContext?: { activeTab?: string; selectedTaskId?: string; selectedProjectId?: string; selectedDate?: string },
    conversationHistory: Array<{ role: string; content: string }> = [],
    intentAnalysis?: any,
    rankedMemories: Array<{ text: string; confidence: number; isConfirmed: boolean }> = [],
    personalityDirectives?: any,
  ) {
    const name = customAssistantName || 'Nova';
    const effectiveKey = overrideKey || this.geminiApiKey;
    let clientAction: string | undefined = undefined;
    let targetTab: string | undefined = undefined;

    // Phase 51.3: Natural Language Universal Workspace Navigation Detection
    const navMatch = userMessage.match(/^(?:please\s+)?(?:can you\s+)?(?:open|show|navigate to|go to|take me to|view|bring up|switch to|launch)\s+(.+)$/i);
    const backMatch = userMessage.match(/^(?:please\s+)?(?:go back|return|navigate back|back to previous)(?:\s+workspace|\s+screen|\s+page)?/i);
    
    if (backMatch) {
      clientAction = 'NAVIGATE_TAB';
      targetTab = '__BACK__';
    } else if (navMatch) {
      const dest = navMatch[1].toLowerCase().replace(/\s+(?:workspace|screen|page)$/, '').trim();
      const tabMap: Record<string, string> = {
        'dashboard': 'dashboard',
        'command center': 'dashboard',
        'home': 'dashboard',
        'tasks': 'work',
        'work': 'work',
        'to-do': 'work',
        'todos': 'work',
        "today's tasks": 'my-day',
        'my day': 'my-day',
        'day': 'my-day',
        'today': 'my-day',
        'projects': 'projects',
        'my projects': 'projects',
        'project hub': 'projects',
        'routines': 'routines',
        'my routines': 'routines',
        'habits': 'routines',
        'my habits': 'routines',
        'focus': 'focus',
        'focus studio': 'focus',
        'pomodoro': 'focus',
        'pomodoro timer': 'focus',
        'timer': 'focus',
        'goals': 'goals',
        'my goals': 'goals',
        'knowledge': 'knowledge',
        'second brain': 'knowledge',
        'notes': 'knowledge',
        'my notes': 'knowledge',
        'hub': 'knowledge',
        'finance': 'finance',
        'finances': 'finance',
        'my finances': 'finance',
        'spending': 'finance',
        'budget': 'finance',
        'wellness': 'wellness',
        'health': 'wellness',
        'my wellness': 'wellness',
        'analytics': 'analytics',
        'productivity analytics': 'analytics',
        'app usage': 'usage-analytics',
        'usage': 'usage-analytics',
        'usage analytics': 'usage-analytics',
        'calendar': 'calendar',
        'my calendar': 'calendar',
        'schedule': 'calendar',
        'planning': 'planning',
        'smart planner': 'smart-planner',
        'ai planner': 'smart-planner',
        'emergency': 'emergency',
        'emergencies': 'emergency',
        'life balance': 'life-balance',
        'timeline': 'timeline',
        'predictive': 'predictive',
        'automation': 'automation',
        'settings': 'settings',
        'preferences': 'settings',
        'chat': 'ai-chat',
        'ai chat': 'ai-chat',
      };

      if (tabMap[dest]) {
        clientAction = 'NAVIGATE_TAB';
        targetTab = tabMap[dest];
      }
    }

    // Phase 51.3: Context-Aware Anaphora Resolution ("complete this task", "archive this project")
    let contextualAction: any = null;
    const lower = userMessage.toLowerCase().trim();
    if ((lower === 'complete this task' || lower.includes('complete this task')) && uiContext?.selectedTaskId) {
      contextualAction = {
        type: 'COMPLETE_TASK',
        description: `Complete task ${uiContext.selectedTaskId}`,
        payload: { taskId: uiContext.selectedTaskId },
      };
    } else if ((lower === 'archive this project' || lower.includes('archive this project')) && uiContext?.selectedProjectId) {
      contextualAction = {
        type: 'ARCHIVE_PROJECT',
        description: `Archive project ${uiContext.selectedProjectId}`,
        payload: { projectId: uiContext.selectedProjectId },
      };
    } else if ((lower === 'move this project to completed' || lower.includes('complete this project')) && uiContext?.selectedProjectId) {
      contextualAction = {
        type: 'UPDATE_PROJECT',
        description: `Mark project ${uiContext.selectedProjectId} as completed`,
        payload: { projectId: uiContext.selectedProjectId, status: 'COMPLETED' },
      };
    }

    // Bounded Contextual Memory Formatting
    const memoryGrounding = rankedMemories && rankedMemories.length > 0
      ? `Relevant User Context & Verified Memories:\n${rankedMemories.map((m) => `- ${m.text}`).join('\n')}`
      : 'No specific prior personal preferences recorded for this request.';

    // Intent & Decision Policy Directives
    const intentGrounding = intentAnalysis
      ? `Analyzed Intent: ${intentAnalysis.primaryIntent} | Decision Policy: ${intentAnalysis.decisionPolicy} | Urgency: ${intentAnalysis.urgency} | Emotion: ${intentAnalysis.detectedEmotion || 'CALM'}`
      : '';

    // Stylistic Pointers
    const styleDirectives = personalityDirectives
      ? `Tone Instruction: ${personalityDirectives.toneInstruction}\nConciseness: ${personalityDirectives.concisenessGuidance}\nRules:\n${personalityDirectives.personalityPointers.map((p: string) => `- ${p}`).join('\n')}`
      : 'Maintain a calm, confident, and articulate tone.';

    const systemPrompt = `You are ${name}, an exceptionally intelligent, composed, and context-aware personal AI executive partner.
Your name is ${name}.
${intentGrounding}
${styleDirectives}

Personal Memory Context:
${memoryGrounding}

Live Platform Data Grounding:
${toolContext.toolUsed ? `[Grounded via ${toolContext.toolUsed}]\n${JSON.stringify(toolContext.toolData, null, 2)}` : 'No domain tool context triggered.'}

Core Rules:
1. Never act like a generic question-answering bot. Never ask "How can I assist you?" after every turn.
2. If the user shares context, vents, or expresses feeling overwhelmed (e.g. "I have a lot to finish today", "This project is becoming a mess"), acknowledge it naturally, offer clear structure or help prioritize, but NEVER immediately create tasks unless explicitly told to do so.
3. When the user asks for advice or asks "What should I do first?", review their current active priorities, compare them, and recommend a clear, actionable next step.
4. When an explicit action is requested (and confirmed by intent policy):
   - For creating a task: [ACTION:CREATE_TASK:{"title":"Task Name","estimatedDurationMinutes":30,"priority":"HIGH"}]
   - For starting focus: [ACTION:START_FOCUS:{"durationMinutes":25}]
   - For setting a reminder: [ACTION:CREATE_REMINDER:{"title":"Call Client","triggerTime":"2026-11-04T16:00:00.000Z"}]
   - For creating a goal: [ACTION:CREATE_GOAL:{"title":"Launch SaaS v2"}]
   - For creating a note: [ACTION:CREATE_NOTE:{"title":"Note Title","content":"Body content"}]
   - For creating a project: [ACTION:CREATE_PROJECT:{"name":"Project Name","description":"Strategic goal"}]
   - For remembering a preference: [ACTION:REMEMBER_PREFERENCE:{"category":"PREFERENCE","key":"Work Preference","value":"Prefers morning deep work"}]
   - For customizing dashboard layout or theme: [ACTION:CUSTOMIZE_DASHBOARD:{"theme":"dark","density":"compact","widgetOrder":["today-schedule","kpi-cards","analytics-charts"]}]`;

    // Call Google Gemini directly via documented x-goog-api-key header
    let cleanKey = (effectiveKey || '').trim();
    if (cleanKey) {
      // 1. Evaluate Circuit Breaker State
      if (this.circuitBreakerState === 'OPEN') {
        if (this.circuitOpenedAt && Date.now() - this.circuitOpenedAt > this.circuitCooldownMs) {
          this.circuitBreakerState = 'HALF_OPEN';
          this.logger.log('Circuit breaker cooldown expired -> transition to HALF_OPEN probe.');
        } else {
          this.logger.warn('Circuit breaker is OPEN. Fast-failing upstream call to grounded fallback.');
          // Fast-fail directly to local grounded engine
          cleanKey = '';
        }
      }
    }

    if (cleanKey) {
      // 2. Concurrency Semaphore Throttling
      if (this.activeConcurrency >= this.maxConcurrency) {
        this.logger.warn(`Max concurrency limit (${this.maxConcurrency}) reached. Redirecting request to grounded engine.`);
      } else {
        this.activeConcurrency++;
        try {
          // Execute request with 1 exponential backoff retry for transient 503/429
          let response: Response | null = null;
          let attempts = 0;
          const maxAttempts = 2;

          while (attempts < maxAttempts) {
            attempts++;
            try {
              // Bounded multi-turn message payload formatting for Gemini API
              const geminiContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

              // If conversation history exists, inject up to 4 previous turns
              if (conversationHistory && conversationHistory.length > 0) {
                for (const turn of conversationHistory.slice(-4)) {
                  geminiContents.push({
                    role: turn.role === 'user' ? 'user' : 'model',
                    parts: [{ text: turn.content }],
                  });
                }
              }

              // Append active prompt with system framing and user utterance
              geminiContents.push({
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nUser request: ${userMessage}` }],
              });

              response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`,
                {
                  method: 'POST',
                  signal: AbortSignal.timeout(15000), // Strict 15s timeout
                  headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': cleanKey,
                  },
                  body: JSON.stringify({
                    contents: geminiContents,
                    generationConfig: {
                      temperature: 0.7,
                      maxOutputTokens: 900,
                    },
                  }),
                },
              );

              if (response.ok) {
                // Upstream success -> reset circuit breaker
                if (this.circuitBreakerState === 'HALF_OPEN') {
                  this.logger.log('HALF_OPEN probe succeeded -> Circuit breaker reset to CLOSED.');
                }
                this.circuitBreakerState = 'CLOSED';
                this.consecutiveUpstreamFailures = 0;
                break;
              }

              // Upstream 503 / 429 rate limit or capacity overload
              if (response.status === 503 || response.status === 429) {
                this.metrics.upstreamRateLimitCount++;
                this.logger.warn(`Gemini upstream pressure: HTTP ${response.status} on attempt ${attempts}`);
                if (attempts < maxAttempts) {
                  // Exponential backoff with jitter: 400ms - 800ms
                  const jitter = Math.floor(Math.random() * 400) + 400;
                  await new Promise((r) => setTimeout(r, jitter));
                  continue;
                }
              } else {
                break;
              }
            } catch (fetchErr: any) {
              this.logger.warn(`Fetch error on attempt ${attempts}: ${fetchErr?.message}`);
              if (attempts >= maxAttempts) break;
              await new Promise((r) => setTimeout(r, 500));
            }
          }

          if (response && response.ok) {
            const json = await response.json();
            const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawText) {
              // Parse potential action proposal
              const actionRegex = /\[ACTION:([A-Z_]+):(\{.*?\})\]/;
              const match = rawText.match(actionRegex);

              let proposedAction: any = null;
              let cleanText = rawText;

              if (match) {
                try {
                  const type = match[1];
                  const payload = JSON.parse(match[2]);
                  proposedAction = {
                    type,
                    description: payload.title
                      ? `Proposed: ${type.replace('_', ' ')} "${payload.title}"`
                      : `Proposed action: ${type.replace('_', ' ')}`,
                    payload,
                  };
                  cleanText = rawText.replace(match[0], '').trim();
                } catch (e) {
                  this.logger.warn(`Failed to parse proposed action payload: ${e}`);
                }
              } else {
                // Intent-based fallback action proposal extraction if user explicitly asked for an action
                const lowerMsg = userMessage.toLowerCase();
                if (lowerMsg.startsWith('create task') || lowerMsg.startsWith('add task')) {
                  const title = userMessage.replace(/^(create task|add task)\s*(called|named)?\s*/i, '').trim() || 'New Task';
                  proposedAction = {
                    type: 'CREATE_TASK',
                    description: `Proposed: Create task "${title}"`,
                    payload: { title, priority: 'HIGH', estimatedDurationMinutes: 30 },
                  };
                } else if (lowerMsg.includes('remind me to') || lowerMsg.startsWith('create reminder')) {
                  const titleMatch = userMessage.match(/(?:remind me to|create reminder for|create reminder)\s+([^at\n\.]+)/i);
                  const title = titleMatch ? titleMatch[1].trim() : 'Scheduled Reminder';
                  proposedAction = {
                    type: 'CREATE_REMINDER',
                    description: `Proposed: Create reminder "${title}"`,
                    payload: { title, triggerTime: new Date(Date.now() + 3600000).toISOString() },
                  };
                } else if (lowerMsg.includes('organize my workspace') || lowerMsg.includes('switch to dark mode') || lowerMsg.includes('compact dashboard')) {
                  const isDark = lowerMsg.includes('dark');
                  const isCompact = lowerMsg.includes('compact') || lowerMsg.includes('project management');
                  proposedAction = {
                    type: 'CUSTOMIZE_DASHBOARD',
                    description: `Proposed: Customize dashboard layout (${isDark ? 'Dark mode' : 'Modern'}, ${isCompact ? 'Compact density' : 'Comfortable'})`,
                    payload: {
                      theme: isDark ? 'dark' : 'light',
                      density: isCompact ? 'compact' : 'comfortable',
                      widgetOrder: ['today-schedule', 'kpi-cards', 'routine-checklist', 'analytics-charts'],
                    },
                  };
                } else if (lowerMsg.startsWith('remember that') || lowerMsg.startsWith('remember:')) {
                  const text = userMessage.replace(/^(remember that|remember:)\s*/i, '').trim();
                  proposedAction = {
                    type: 'REMEMBER_PREFERENCE',
                    description: `Proposed: Remember preference "${text}"`,
                    payload: { category: 'WORK_STYLE', key: text.split(' ')[0] || 'General', value: text },
                  };
                }
              }

              return {
                replyText: cleanText,
                proposedAction: proposedAction || contextualAction,
                clientAction,
                tab: targetTab,
                providerStatus: {
                  status: 'ACTIVE_DEVELOPER_KEY',
                  model: this.geminiModel,
                  source: 'DEVELOPER_API_KEY',
                  latencyMs: 0,
                },
              };
            }
          } else {
            // Failure handling and circuit breaker trip check
            this.consecutiveUpstreamFailures++;
            if (this.consecutiveUpstreamFailures >= 3) {
              this.circuitBreakerState = 'OPEN';
              this.circuitOpenedAt = Date.now();
              this.metrics.circuitBreakerTrips++;
              this.logger.error(`Trip! 3 consecutive upstream failures recorded. Circuit breaker set to OPEN for 30s.`);
            }
            const errStatus = response ? response.status : 'NO_RESPONSE';
            this.logger.warn(`Gemini API call failed with status: ${errStatus}. Failing over to grounded engine.`);
          }
        } catch (err: any) {
          this.consecutiveUpstreamFailures++;
          if (this.consecutiveUpstreamFailures >= 3) {
            this.circuitBreakerState = 'OPEN';
            this.circuitOpenedAt = Date.now();
            this.metrics.circuitBreakerTrips++;
          }
          this.logger.warn(`Failed calling Gemini API: ${err?.message}`);
        } finally {
          this.activeConcurrency = Math.max(0, this.activeConcurrency - 1);
        }
      }
    }

    // Fallback: Context-grounded deterministic personal operating assistant response
    let fallbackAction: any = null;
    let actionReply = '';

    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.startsWith('create task') || lowerMsg.startsWith('add task')) {
      const title = userMessage.replace(/^(create task|add task)\s*/i, '').trim() || 'New Task';
      fallbackAction = {
        type: 'CREATE_TASK',
        description: `Proposed: Create task "${title}"`,
        payload: { title, priority: 'HIGH', estimatedDurationMinutes: 30 },
      };
      actionReply = `I've prepared a proposed task: "${title}". Please confirm to add it to your schedule.`;
    } else if (lowerMsg.includes('reminder') || lowerMsg.includes('remind me')) {
      const titleMatch = userMessage.match(/(?:reminder for|remind me to)\s+([^at\n\.]+)/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Scheduled Reminder';
      fallbackAction = {
        type: 'CREATE_REMINDER',
        description: `Proposed: Create reminder "${title}"`,
        payload: { title, triggerTime: new Date(Date.now() + 3600000).toISOString() },
      };
      actionReply = `I've prepared a reminder: "${title}". Please confirm to schedule it.`;
    } else if (lowerMsg.includes('start focus') || lowerMsg.includes('focus session')) {
      fallbackAction = {
        type: 'START_FOCUS',
        description: 'Proposed: Start 25-minute focus session',
        payload: { durationMinutes: 25 },
      };
      actionReply = `I've prepared a 25-minute focus session. Would you like to start now?`;
    } else if (lowerMsg.includes('reorganize my entire day') || lowerMsg.includes('bulk reschedule')) {
      fallbackAction = {
        type: 'AUTONOMOUS_SCHEDULE_REORGANIZATION',
        description: 'Autonomous multi-step schedule optimization',
        payload: { strategy: 'DEEP_WORK_BLOCKING' },
      };
      actionReply = `I've enqueued an autonomous schedule reorganization workflow across your commitments.`;
    }

    // Context-driven reasoning reply based on retrieved tool context
    if (!actionReply) {
      if (clientAction === 'NAVIGATE_TAB' && targetTab) {
        actionReply = `Navigating to your ${targetTab} workspace.`;
      } else if (contextualAction) {
        fallbackAction = contextualAction;
        actionReply = `I've prepared the requested operation on the active record: ${contextualAction.description}. Please confirm to execute.`;
      } else if (toolContext.toolUsed === 'get_personal_briefing') {
        const d = toolContext.toolData;
        actionReply = `Good morning, Selma. I'm ${name}. Today you have ${d?.tasksTotal || 0} scheduled tasks (${d?.tasksCompleted || 0} completed, ${d?.tasksPending || 0} pending) and ${d?.routinesTotal || 0} habits. ${d?.topPriorities?.length > 0 ? `Your top priority is "${d.topPriorities[0]}".` : 'No urgent priorities flagged.'
          } ${d?.overdueCount > 0 ? `Warning: You have ${d.overdueCount} overdue items.` : 'No overdue items.'} Your focus target is ${d?.focusTargetMinutes || 120} minutes.`;
      } else if (toolContext.toolUsed === 'get_day_schedule') {
        const d = toolContext.toolData;
        const taskList = (d?.tasks || []).map((t: any) => `${t.title} (${t.priority} priority, ${t.status})`).join('; ');
        actionReply = d?.totalScheduledTasks > 0
          ? `You have ${d.totalScheduledTasks} tasks scheduled for today: ${taskList}.`
          : `You currently have no tasks scheduled for today. Would you like me to propose a daily plan?`;
      } else if (toolContext.toolUsed === 'get_finance_summary') {
        const d = toolContext.toolData;
        actionReply = `Here is your financial summary for ${d?.currentMonth || 'this month'}: Your net worth is ${d?.formattedNetWorth || '₹0'}. You have earned ${d?.formattedMonthIncome || '₹0'} and spent ${d?.formattedMonthExpenses || '₹0'}, with net savings of ₹${(d?.netSavings || 0).toLocaleString('en-IN')} (savings rate: ${d?.savingsRate || 0}%).`;
      } else if (toolContext.toolUsed === 'get_goals_summary') {
        const goals = toolContext.toolData || [];
        const goalList = goals.map((g: any) => `"${g.title}" (${g.progressPercent}% complete)`).join(', ');
        actionReply = goals.length > 0
          ? `You have ${goals.length} active goals in progress: ${goalList}.`
          : `You have no active goals in progress right now. Would you like to create one?`;
      } else if (toolContext.toolUsed === 'get_focus_summary') {
        const d = toolContext.toolData;
        actionReply = `Today you have logged ${d?.todayFocusMinutes || 0} minutes of deep work towards your ${d?.dailyTargetMinutes || 120}-minute target (${d?.targetProgressPercent || 0}%). ${d?.hasActiveSession ? `You currently have an active session for "${d.activeSession?.taskTitle}".` : 'No focus session is currently running.'
          }`;
      } else if (toolContext.toolUsed === 'get_life_balance_summary') {
        const d = toolContext.toolData;
        actionReply = `Your life balance summary: ${d?.exerciseStatus}, ${d?.waterIntake}, and sleep recorded as ${d?.sleepDuration}. Your wellness trend is ${d?.wellnessTrend}.`;
      } else if (toolContext.toolUsed === 'search_knowledge') {
        const notes = toolContext.toolData || [];
        actionReply = notes.length > 0
          ? `Found ${notes.length} matching knowledge documents: ${notes.map((n: any) => `"${n.title}" (${n.category})`).join(', ')}.`
          : `I searched your second brain but found no notes matching "${userMessage}". Would you like me to create a new note?`;
      } else if (toolContext.toolUsed === 'get_predictive_recommendations') {
        const d = toolContext.toolData;
        actionReply = `Productivity Intelligence: Overload risk is ${d?.overloadRisk}. Recommended peak focus window: ${d?.recommendedFocusSlot}. ${d?.routineStreakRecommendation}.`;
      } else if (toolContext.toolUsed === 'get_user_progress_analysis') {
        const d = toolContext.toolData;
        actionReply = `Comprehensive progress analysis: Task completion rate is ${d?.tasks?.completionRate || '100%'} (${d?.tasks?.completed}/${d?.tasks?.total} tasks), focus time logged: ${d?.focus?.totalMinutes || 0}m, habit adherence: ${d?.habits?.adherence || '100%'}, and system health is ${d?.systemHealth || 'Optimal'}.`;
      } else if (lowerMsg.includes('how are you') || lowerMsg.includes('how do you do')) {
        actionReply = `I'm doing well and fully synchronized with your workspace. How can I assist you with your tasks or schedule today?`;
      } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi ') || lowerMsg === 'hi' || lowerMsg.includes('hey')) {
        actionReply = `Hello! I'm ${name}, your personal operating partner. What would you like to review or accomplish today?`;
      } else if (lowerMsg.includes('what can you do') || lowerMsg.includes('help')) {
        actionReply = `I can brief you on today's schedule, manage and prioritize tasks, track your focus sessions, analyze spending and net worth, review your goals, search your knowledge hub, and execute autonomous workflows. What would you like to start with?`;
      } else {
        actionReply = `I have reviewed your request. Everything in your workspace is aligned and synchronized. You can ask me to brief your day, check tasks, analyze spending, or start a focus session.`;
      }
    }

    return {
      replyText: `[${name} AI Operating Partner] ${actionReply}`,
      proposedAction: fallbackAction,
      clientAction,
      tab: targetTab,
      providerStatus: {
        status: cleanKey ? 'INVALID_CREDENTIAL' : 'NOT_CONFIGURED',
        model: 'grounded-platform-model',
        source: 'GROUNDED_FALLBACK',
        message: cleanKey
          ? 'Gemini remote authentication was unauthenticated; operating in grounded local intelligence mode.'
          : 'No GEMINI_API_KEY configured; operating in grounded local intelligence mode.',
      },
    };
  }

  /**
   * Streaming Chat Pipeline
   * Yields SSE / chunked payloads directly to client
   */
  async *streamChat(userId: string, dto: SendMessageDto, signal?: AbortSignal) {
  const category = this.classifyRequest(dto.message);
  const toolContext = await this.gatherContextForPrompt(userId, dto.message);
  const effectiveKey = dto.geminiApiKey || this.geminiApiKey;
  const name = dto.assistantName || 'Nova';

  // Check if real Gemini key is available (support any valid key format, e.g. AQ. or AIzaSy)
  const cleanKey = (effectiveKey || '').trim();
  if (cleanKey) {
    try {
      const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:streamGenerateContent?alt=sse`;
      const res = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: dto.message }] }],
        }),
      });

      if (res.ok && res.body) {
        const reader = (res.body as any).getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                const candidateText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (candidateText) {
                  accumulatedText += candidateText;
                  yield { type: 'token', content: candidateText, category };
                }
              } catch (_) {
                // Ignore SSE ping or formatting line
              }
            }
          }
        }

        yield { type: 'done', fullText: accumulatedText, category };
        return;
      }
    } catch (streamErr: any) {
      this.logger.warn(`Remote streaming failed: ${streamErr.message}. Falling back to progressive grounded generator.`);
    }
  }

  // Grounded Progressive Streaming
  const fallbackResponse = await this.chat(userId, dto);
  const fullText = fallbackResponse.message.content;
  const tokens = fullText.split(' ');

  for (const token of tokens) {
    if (signal?.aborted) return;
      yield { type: 'token', content: token + ' ', category };
    await new Promise((r) => setTimeout(r, 20));
  }

    yield {
    type: 'done',
      fullText,
      conversationId: fallbackResponse.conversationId,
        messageId: fallbackResponse.message.id,
          toolUsed: fallbackResponse.toolUsed,
            proposedAction: fallbackResponse.proposedAction,
              providerStatus: fallbackResponse.providerStatus,
                category,
    };
}
}
