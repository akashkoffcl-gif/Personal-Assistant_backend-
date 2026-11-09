import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AIService } from './ai.service';
import { AIToolsService } from './ai-tools.service';
import { SmartPlannerService } from './smart-planner.service';
import { AIMemoryService } from './ai-memory.service';
import { AIDashboardCustomizationService } from './ai-customization.service';
import { JarvisToolRegistryService } from './jarvis-tool-registry.service';
import { WorkflowPlannerService } from './workflow/workflow-planner.service';
import { WorkflowOrchestratorService } from './workflow/workflow-orchestrator.service';
import { ProactiveIntelligenceService } from './proactive-intelligence.service';
import { SendMessageDto, ExecuteActionDto, ProposePlanDto, ApplyPlanDto, PlanWorkflowDto, ApproveWorkflowDto } from './dto/ai.dto';

@Controller('ai')
@UseGuards(SupabaseAuthGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly aiTools: AIToolsService,
    private readonly smartPlannerService: SmartPlannerService,
    private readonly aiMemory: AIMemoryService,
    private readonly aiCustomization: AIDashboardCustomizationService,
    private readonly jarvisRegistry: JarvisToolRegistryService,
    private readonly workflowPlanner: WorkflowPlannerService,
    private readonly workflowOrchestrator: WorkflowOrchestratorService,
    private readonly proactiveIntelligence: ProactiveIntelligenceService,
  ) {}

  @Get('proactive/opportunities')
  async getProactiveOpportunities(@Req() req: any) {
    const userId = req.user.id;
    return this.proactiveIntelligence.evaluateProactiveOpportunities(userId);
  }

  @Post('proactive/feedback')
  async recordProactiveFeedback(
    @Req() req: any,
    @Body('opportunityId') opportunityId: string,
    @Body('action') action: 'ACCEPTED' | 'DISMISSED' | 'SNOOZED',
  ) {
    const userId = req.user.id;
    return this.proactiveIntelligence.recordFeedback(userId, opportunityId, action);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    const userId = req.user.id;
    return this.aiService.getConversations(userId);
  }

  @Get('conversations/:id')
  async getConversationById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.aiService.getConversationById(userId, id);
  }

  @Patch('conversations/:id')
  async renameConversation(
    @Req() req: any,
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    const userId = req.user.id;
    return this.aiService.renameConversation(userId, id, title);
  }

  @Delete('conversations/:id')
  async deleteConversation(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.aiService.deleteConversation(userId, id);
  }

  @Get('provider-status')
  async getProviderStatus(@Query('key') key?: string) {
    return this.aiService.getProviderStatus(key);
  }

  @Get('operational-metrics')
  async getOperationalMetrics(@Req() req: any) {
    const user = req.user;
    // Strict Administrative RBAC: Only 'admin' or demo supervisor ID has access
    if (user.role !== 'admin' && user.id !== '00000000-0000-0000-0000-000000000001') {
      throw new ForbiddenException('Administrative access required for operational metrics.');
    }
    return this.aiService.getOperationalMetrics();
  }

  @Post('chat')
  async chat(@Req() req: any, @Body() dto: SendMessageDto) {
    const userId = req.user.id;
    return this.aiService.chat(userId, dto);
  }

  @Post('chat/stream')
  async streamChat(@Req() req: any, @Body() dto: SendMessageDto, @Res() res: any) {
    const userId = req.user.id;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.aiService.streamChat(userId, dto)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }

  @Get('briefing')
  async getBriefing(@Req() req: any) {
    const userId = req.user.id;
    return this.aiTools.getPersonalBriefing(userId);
  }

  @Post('actions/:id/execute')
  async executeAction(
    @Req() req: any,
    @Param('id') actionId: string,
    @Body() dto: ExecuteActionDto,
  ) {
    const userId = req.user.id;
    return this.aiService.executeAction(userId, actionId, dto.confirmed);
  }

  // ==================== SMART PLANNER ====================
  @Post(['planner/propose', 'smart-planner/generate'])
  async proposeDayPlan(@Req() req: any, @Body() dto: ProposePlanDto) {
    const userId = req.user.id;
    return this.smartPlannerService.proposeDayPlan(userId, dto.date, dto.preferences);
  }

  @Post(['planner/apply', 'smart-planner/commit'])
  async applyDayPlan(@Req() req: any, @Body() dto: ApplyPlanDto) {
    const userId = req.user.id;
    return this.smartPlannerService.applyDayPlan(userId, dto.proposalId);
  }

  @Get('planner/proposals')
  async getProposals(@Req() req: any, @Query('date') date?: string) {
    const userId = req.user.id;
    return this.smartPlannerService.getProposals(userId, date);
  }

  // ==================== JARVIS PERSONAL MEMORY ====================
  @Get('memory')
  async getMemories(@Req() req: any) {
    return this.aiMemory.getMemories(req.user.id);
  }

  @Post('memory')
  async rememberPreference(
    @Req() req: any,
    @Body('category') category: any,
    @Body('key') key: string,
    @Body('value') value: string,
  ) {
    return this.aiMemory.remember(req.user.id, category, key, value, 'USER_EXPLICIT');
  }

  @Delete('memory/:id')
  async forgetMemory(@Req() req: any, @Param('id') memoryId: string) {
    return this.aiMemory.forget(req.user.id, memoryId);
  }

  // ==================== JARVIS DASHBOARD CUSTOMIZATION ====================
  @Get('customization/layout')
  async getLayoutConfig(@Req() req: any) {
    return this.aiCustomization.getLayoutConfig(req.user.id);
  }

  @Patch('customization/layout')
  async updateLayoutConfig(@Req() req: any, @Body() config: any) {
    return this.aiCustomization.updateLayoutConfig(req.user.id, config);
  }

  @Post('customization/reset')
  async resetLayoutConfig(@Req() req: any) {
    return this.aiCustomization.resetToDefaults(req.user.id);
  }

  // ==================== JARVIS UNIFIED TOOL REGISTRY ====================
  @Get('tools')
  async listRegisteredTools() {
    return this.jarvisRegistry.getAllTools().map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      riskLevel: t.riskLevel,
      requiresConfirmation: t.requiresConfirmation,
      inputSchema: t.inputSchema,
    }));
  }

  @Post('tools/:id/execute')
  async executeToolDirectly(@Req() req: any, @Param('id') toolId: string, @Body() payload: any) {
    return this.jarvisRegistry.executeTool(req.user.id, toolId, payload);
  }

  // ==================== MULTI-STEP AUTONOMOUS WORKFLOWS ====================
  @Post('workflows/plan')
  async planWorkflow(@Req() req: any, @Body() dto: PlanWorkflowDto) {
    return this.workflowPlanner.planWorkflow(req.user.id, dto.prompt);
  }

  @Post('workflows/:id/approve')
  async approveWorkflow(
    @Req() req: any,
    @Param('id') workflowId: string,
    @Body() dto: ApproveWorkflowDto,
  ) {
    return this.workflowPlanner.approveWorkflow(req.user.id, workflowId, dto.confirmedPayloadHash);
  }

  @Post('workflows/:id/reject')
  async rejectWorkflow(@Req() req: any, @Param('id') workflowId: string) {
    return this.workflowPlanner.rejectWorkflow(req.user.id, workflowId);
  }

  @Post('workflows/:id/cancel')
  async cancelWorkflow(@Req() req: any, @Param('id') workflowId: string, @Body() body?: { reason?: string }) {
    return this.workflowOrchestrator.cancelWorkflow(req.user.id, workflowId, body?.reason);
  }

  @Post('workflows/:id/execute')
  async executeWorkflow(
    @Req() req: any,
    @Param('id') workflowId: string,
    @Query('workerToken') workerToken?: string,
  ) {
    return this.workflowOrchestrator.executeWorkflow(req.user.id, workflowId, workerToken);
  }

  @Get('workflows/:id/execute/stream')
  async streamWorkflowExecution(
    @Req() req: any,
    @Res() res: any,
    @Param('id') workflowId: string,
    @Query('workerToken') workerToken?: string,
  ) {
    const userId = req.user.id;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.workflowOrchestrator.executeWorkflowStream(userId, workflowId, workerToken)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'FAILED', error: err.message })}\n\n`);
      res.end();
    }
  }
}
