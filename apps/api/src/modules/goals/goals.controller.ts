import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { GoalsService } from './goals.service';
import { GoalType, GoalStatus } from '@prisma/client';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  LogGoalProgressDto,
} from './dto/goal.dto';

@Controller('goals')
@UseGuards(SupabaseAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async getGoals(
    @Req() req: any,
    @Query('type') type?: GoalType,
    @Query('status') status?: GoalStatus,
    @Query('parentId') parentId?: string,
  ) {
    const userId = req.user.id;
    return this.goalsService.getGoals(userId, { type, status, parentId });
  }

  @Get('summary')
  async getGoalsSummary(@Req() req: any) {
    const userId = req.user.id;
    return this.goalsService.getGoalsSummary(userId);
  }

  @Get(':id')
  async getGoalById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.goalsService.getGoalById(userId, id);
  }

  @Post()
  async createGoal(@Req() req: any, @Body() dto: CreateGoalDto) {
    const userId = req.user.id;
    return this.goalsService.createGoal(userId, dto);
  }

  @Patch(':id')
  async updateGoal(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const userId = req.user.id;
    return this.goalsService.updateGoal(userId, id, dto);
  }

  @Delete(':id')
  async deleteGoal(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.goalsService.deleteGoal(userId, id);
  }

  @Post(':id/milestones')
  async addMilestone(
    @Req() req: any,
    @Param('id') goalId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    const userId = req.user.id;
    return this.goalsService.addMilestone(userId, goalId, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  async updateMilestone(
    @Req() req: any,
    @Param('id') goalId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    const userId = req.user.id;
    return this.goalsService.updateMilestone(userId, goalId, milestoneId, dto);
  }

  @Put(':id/milestones/:milestoneId')
  async updateMilestonePut(
    @Req() req: any,
    @Param('id') goalId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    const userId = req.user.id;
    return this.goalsService.updateMilestone(userId, goalId, milestoneId, dto);
  }

  @Delete(':id/milestones/:milestoneId')
  async deleteMilestone(
    @Req() req: any,
    @Param('id') goalId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    const userId = req.user.id;
    return this.goalsService.deleteMilestone(userId, goalId, milestoneId);
  }

  @Post(':id/progress')
  async logProgress(
    @Req() req: any,
    @Param('id') goalId: string,
    @Body() dto: LogGoalProgressDto,
  ) {
    const userId = req.user.id;
    return this.goalsService.logProgress(userId, goalId, dto);
  }
}
