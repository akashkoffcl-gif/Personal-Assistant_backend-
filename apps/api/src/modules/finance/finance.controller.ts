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
} from '@nestjs/common';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { FinanceService } from './finance.service';
import { TransactionType } from '@prisma/client';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateCategoryDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateBudgetDto,
  CreateSavingsGoalDto,
  ContributeSavingsGoalDto,
  CreateRecurringDto,
} from './dto/finance.dto';

@Controller('finance')
@UseGuards(SupabaseAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==================== ANALYTICS & EXPORT ====================
  @Get(['analytics', 'summary'])
  async getAnalytics(@Req() req: any, @Query('month') month?: string) {
    const userId = req.user.id;
    return this.financeService.getFinanceAnalytics(userId, month);
  }

  @Get(['export/csv', 'export'])
  async exportCsv(@Req() req: any, @Res() res: Response) {
    const userId = req.user.id;
    const csv = await this.financeService.exportTransactionsCsv(userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().substring(0, 10)}.csv`);
    return res.send(csv);
  }

  // ==================== ACCOUNTS ====================
  @Get('accounts')
  async getAccounts(@Req() req: any) {
    const userId = req.user.id;
    return this.financeService.getAccounts(userId);
  }

  @Post('accounts')
  async createAccount(@Req() req: any, @Body() dto: CreateAccountDto) {
    const userId = req.user.id;
    return this.financeService.createAccount(userId, dto);
  }

  @Patch('accounts/:id')
  async updateAccount(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const userId = req.user.id;
    return this.financeService.updateAccount(userId, id, dto);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.financeService.deleteAccount(userId, id);
  }

  // ==================== CATEGORIES ====================
  @Get('categories')
  async getCategories(@Req() req: any) {
    const userId = req.user.id;
    return this.financeService.getCategories(userId);
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() dto: CreateCategoryDto) {
    const userId = req.user.id;
    return this.financeService.createCategory(userId, dto);
  }

  // ==================== TRANSACTIONS ====================
  @Get('transactions')
  async getTransactions(
    @Req() req: any,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: TransactionType,
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    return this.financeService.getTransactions(userId, {
      accountId,
      categoryId,
      type,
      month,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('transactions')
  async createTransaction(@Req() req: any, @Body() dto: CreateTransactionDto) {
    const userId = req.user.id;
    return this.financeService.createTransaction(userId, dto);
  }

  @Patch('transactions/:id')
  async updateTransaction(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    const userId = req.user.id;
    return this.financeService.updateTransaction(userId, id, dto);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.financeService.deleteTransaction(userId, id);
  }

  // ==================== BUDGETS ====================
  @Get('budgets')
  async getBudgets(@Req() req: any, @Query('month') month?: string) {
    const userId = req.user.id;
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    return this.financeService.getBudgets(userId, targetMonth);
  }

  @Post('budgets')
  async setBudget(@Req() req: any, @Body() dto: CreateBudgetDto) {
    const userId = req.user.id;
    return this.financeService.setBudget(userId, dto);
  }

  @Delete('budgets/:id')
  async deleteBudget(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.financeService.deleteBudget(userId, id);
  }

  // ==================== SAVINGS GOALS ====================
  @Get('savings')
  async getSavingsGoals(@Req() req: any) {
    const userId = req.user.id;
    return this.financeService.getSavingsGoals(userId);
  }

  @Post('savings')
  async createSavingsGoal(@Req() req: any, @Body() dto: CreateSavingsGoalDto) {
    const userId = req.user.id;
    return this.financeService.createSavingsGoal(userId, dto);
  }

  @Post('savings/:id/contribute')
  async contributeSavingsGoal(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ContributeSavingsGoalDto,
  ) {
    const userId = req.user.id;
    return this.financeService.contributeSavingsGoal(userId, id, dto);
  }

  @Delete('savings/:id')
  async deleteSavingsGoal(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.financeService.deleteSavingsGoal(userId, id);
  }

  // ==================== RECURRING TRANSACTIONS ====================
  @Get('recurring')
  async getRecurringTransactions(@Req() req: any) {
    const userId = req.user.id;
    return this.financeService.getRecurringTransactions(userId);
  }

  @Post('recurring')
  async createRecurringTransaction(@Req() req: any, @Body() dto: CreateRecurringDto) {
    const userId = req.user.id;
    return this.financeService.createRecurringTransaction(userId, dto);
  }

  @Delete('recurring/:id')
  async deleteRecurringTransaction(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.financeService.deleteRecurringTransaction(userId, id);
  }
}
