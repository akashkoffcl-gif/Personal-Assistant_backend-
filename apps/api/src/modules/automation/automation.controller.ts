import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AutomationService } from './automation.service';

@Controller('automation')
@UseGuards(SupabaseAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('rules')
  async getRules(@CurrentUser() user: AuthenticatedUser) {
    return this.automationService.getRules(user.id);
  }

  @Post('rules')
  async createRule(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      ruleType: string;
      condition: Record<string, any>;
      action: Record<string, any>;
      cooldownMinutes?: number;
    },
  ) {
    return this.automationService.createRule(user.id, body);
  }

  @Post('rules/:id/toggle')
  async toggleRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('isEnabled') isEnabled: boolean,
  ) {
    return this.automationService.toggleRule(user.id, id, isEnabled);
  }

  @Get('executions')
  async getExecutions(@CurrentUser() user: AuthenticatedUser) {
    return this.automationService.getExecutions(user.id);
  }

  @Post('evaluate')
  async evaluateRules(@CurrentUser() user: AuthenticatedUser) {
    return this.automationService.evaluateRules(user.id);
  }
}

