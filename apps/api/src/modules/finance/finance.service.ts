import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma, FinanceAccountType, TransactionType } from '@prisma/client';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateCategoryDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateBudgetDto,
  UpdateBudgetDto,
  CreateSavingsGoalDto,
  ContributeSavingsGoalDto,
  CreateRecurringDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. ACCOUNTS
  // ==========================================
  async getAccounts(userId: string) {
    return this.prisma.financeAccount.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAccount(userId: string, dto: CreateAccountDto) {
    const balance = new Prisma.Decimal(dto.initialBalance || 0);

    return this.prisma.financeAccount.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type || FinanceAccountType.CHECKING,
        balance,
        currency: dto.currency || 'INR',
        color: dto.color || '#8B45F5',
        isDefault: dto.isDefault || false,
      },
    });
  }

  async updateAccount(userId: string, accountId: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!existing) throw new NotFoundException(`Account ${accountId} not found`);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.balance !== undefined) data.balance = new Prisma.Decimal(dto.balance);

    return this.prisma.financeAccount.update({
      where: { id: accountId },
      data,
    });
  }

  async deleteAccount(userId: string, accountId: string) {
    const existing = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!existing) throw new NotFoundException(`Account ${accountId} not found`);

    await this.prisma.financeAccount.delete({
      where: { id: accountId },
    });

    return { success: true };
  }

  // ==========================================
  // 2. CATEGORIES
  // ==========================================
  async getCategories(userId: string) {
    await this.seedDefaultCategoriesIfEmpty(userId);
    return this.prisma.financeCategory.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    return this.prisma.financeCategory.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type || TransactionType.EXPENSE,
        icon: dto.icon || 'tag',
        color: dto.color || '#8B45F5',
      },
    });
  }

  private async seedDefaultCategoriesIfEmpty(userId: string) {
    const count = await this.prisma.financeCategory.count({ where: { userId } });
    if (count > 0) return;

    const defaults = [
      { name: 'Salary', type: TransactionType.INCOME, icon: 'briefcase', color: '#10B981' },
      { name: 'Freelance & Consulting', type: TransactionType.INCOME, icon: 'laptop', color: '#06B6D4' },
      { name: 'Investment Returns', type: TransactionType.INCOME, icon: 'trending-up', color: '#8B45F5' },
      { name: 'Housing & Rent', type: TransactionType.EXPENSE, icon: 'home', color: '#6366F1' },
      { name: 'Groceries & Food', type: TransactionType.EXPENSE, icon: 'shopping-cart', color: '#F59E0B' },
      { name: 'Dining Out', type: TransactionType.EXPENSE, icon: 'coffee', color: '#EC4899' },
      { name: 'Transportation', type: TransactionType.EXPENSE, icon: 'car', color: '#3B82F6' },
      { name: 'Utilities & Bills', type: TransactionType.EXPENSE, icon: 'zap', color: '#F97316' },
      { name: 'Healthcare & Wellness', type: TransactionType.EXPENSE, icon: 'heart', color: '#10B981' },
      { name: 'Entertainment & Leisure', type: TransactionType.EXPENSE, icon: 'film', color: '#A855F7' },
      { name: 'Software Subscriptions', type: TransactionType.EXPENSE, icon: 'cloud', color: '#8B45F5' },
    ];

    for (const cat of defaults) {
      await this.prisma.financeCategory.upsert({
        where: { userId_name_type: { userId, name: cat.name, type: cat.type } },
        update: {},
        create: {
          userId,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
        },
      });
    }
  }

  // ==========================================
  // 3. TRANSACTIONS
  // ==========================================
  async getTransactions(
    userId: string,
    query?: {
      accountId?: string;
      categoryId?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      month?: string;
      limit?: number;
    },
  ) {
    const where: any = { userId };
    if (query?.accountId) where.accountId = query.accountId;
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.type) where.type = query.type;

    if (query?.month) {
      where.date = { startsWith: query.month };
    } else if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = query.startDate;
      if (query.endDate) where.date.lte = query.endDate;
    }

    return this.prisma.financeTransaction.findMany({
      where,
      include: {
        account: true,
        category: true,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: query?.limit || 100,
    });
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const account = await this.prisma.financeAccount.findFirst({
      where: { id: dto.accountId, userId },
    });
    if (!account) throw new NotFoundException(`Account ${dto.accountId} not found`);

    const amountDecimal = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const transaction = await tx.financeTransaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId || null,
          type: dto.type,
          amount: amountDecimal,
          currency: dto.currency || account.currency || 'INR',
          date: dto.date,
          description: dto.description,
          notes: dto.notes || null,
          paymentMethod: dto.paymentMethod || 'OTHER',
        },
        include: { account: true, category: true },
      });

      // 2. Adjust account balance
      let newBalance = account.balance;
      if (dto.type === TransactionType.INCOME) {
        newBalance = newBalance.add(amountDecimal);
      } else if (dto.type === TransactionType.EXPENSE) {
        newBalance = newBalance.sub(amountDecimal);
      }

      await tx.financeAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      return transaction;
    });
  }

  async updateTransaction(userId: string, transactionId: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.financeTransaction.findFirst({
      where: { id: transactionId, userId },
      include: { account: true },
    });
    if (!existing) throw new NotFoundException(`Transaction ${transactionId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Revert previous balance impact
      let restoredBalance = existing.account.balance;
      if (existing.type === TransactionType.INCOME) {
        restoredBalance = restoredBalance.sub(existing.amount);
      } else if (existing.type === TransactionType.EXPENSE) {
        restoredBalance = restoredBalance.add(existing.amount);
      }

      const newType = dto.type || existing.type;
      const newAmount = dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : existing.amount;

      // Apply new impact
      let finalBalance = restoredBalance;
      if (newType === TransactionType.INCOME) {
        finalBalance = finalBalance.add(newAmount);
      } else if (newType === TransactionType.EXPENSE) {
        finalBalance = finalBalance.sub(newAmount);
      }

      await tx.financeAccount.update({
        where: { id: existing.accountId },
        data: { balance: finalBalance },
      });

      return tx.financeTransaction.update({
        where: { id: transactionId },
        data: {
          accountId: dto.accountId || existing.accountId,
          categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
          type: newType,
          amount: newAmount,
          date: dto.date || existing.date,
          description: dto.description || existing.description,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          paymentMethod: dto.paymentMethod || existing.paymentMethod,
        },
        include: { account: true, category: true },
      });
    });
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const existing = await this.prisma.financeTransaction.findFirst({
      where: { id: transactionId, userId },
      include: { account: true },
    });
    if (!existing) throw new NotFoundException(`Transaction ${transactionId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // Revert balance
      let newBalance = existing.account.balance;
      if (existing.type === TransactionType.INCOME) {
        newBalance = newBalance.sub(existing.amount);
      } else if (existing.type === TransactionType.EXPENSE) {
        newBalance = newBalance.add(existing.amount);
      }

      await tx.financeAccount.update({
        where: { id: existing.accountId },
        data: { balance: newBalance },
      });

      await tx.financeTransaction.delete({
        where: { id: transactionId },
      });

      return { success: true };
    });
  }

  // ==========================================
  // 4. BUDGETS
  // ==========================================
  async getBudgets(userId: string, month: string) {
    const budgets = await this.prisma.financeBudget.findMany({
      where: { userId, month },
      include: { category: true },
    });

    const monthlyTransactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        date: { startsWith: month },
        type: TransactionType.EXPENSE,
      },
    });

    return budgets.map((b) => {
      const spent = monthlyTransactions
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0));

      const allocated = b.allocatedAmount;
      const remaining = allocated.sub(spent);
      const percentUsed = allocated.gt(0)
        ? Math.round(spent.div(allocated).mul(100).toNumber())
        : 0;

      return {
        ...b,
        spentAmount: spent.toNumber(),
        remainingAmount: remaining.toNumber(),
        percentUsed: Math.min(200, percentUsed),
        isOverBudget: spent.gt(allocated),
      };
    });
  }

  async setBudget(userId: string, dto: CreateBudgetDto) {
    return this.prisma.financeBudget.upsert({
      where: {
        userId_categoryId_month: {
          userId,
          categoryId: dto.categoryId,
          month: dto.month,
        },
      },
      update: {
        allocatedAmount: new Prisma.Decimal(dto.allocatedAmount),
      },
      create: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        allocatedAmount: new Prisma.Decimal(dto.allocatedAmount),
      },
      include: { category: true },
    });
  }

  async deleteBudget(userId: string, budgetId: string) {
    const existing = await this.prisma.financeBudget.findFirst({
      where: { id: budgetId, userId },
    });
    if (!existing) throw new NotFoundException(`Budget ${budgetId} not found`);

    await this.prisma.financeBudget.delete({
      where: { id: budgetId },
    });

    return { success: true };
  }

  // ==========================================
  // 5. SAVINGS GOALS
  // ==========================================
  async getSavingsGoals(userId: string) {
    return this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSavingsGoal(userId: string, dto: CreateSavingsGoalDto) {
    const targetAmount = new Prisma.Decimal(dto.targetAmount);
    const currentAmount = new Prisma.Decimal(dto.initialAmount || 0);

    return this.prisma.savingsGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount,
        currentAmount,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        color: dto.color || '#10B981',
        status: currentAmount.gte(targetAmount) ? 'COMPLETED' : 'ACTIVE',
      },
    });
  }

  async contributeSavingsGoal(userId: string, goalId: string, dto: ContributeSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) throw new NotFoundException(`Savings goal ${goalId} not found`);

    const addition = new Prisma.Decimal(dto.amount);
    const newCurrent = goal.currentAmount.add(addition);
    const isCompleted = newCurrent.gte(goal.targetAmount);

    return this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: newCurrent,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
      },
    });
  }

  async deleteSavingsGoal(userId: string, goalId: string) {
    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) throw new NotFoundException(`Savings goal ${goalId} not found`);

    await this.prisma.savingsGoal.delete({
      where: { id: goalId },
    });

    return { success: true };
  }

  // ==========================================
  // 6. RECURRING & SUBSCRIPTIONS
  // ==========================================
  async getRecurringTransactions(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
      orderBy: { nextDate: 'asc' },
    });
  }

  async createRecurringTransaction(userId: string, dto: CreateRecurringDto) {
    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId || null,
        title: dto.title,
        amount: new Prisma.Decimal(dto.amount),
        type: dto.type || TransactionType.EXPENSE,
        frequency: dto.frequency || 'MONTHLY',
        nextDate: dto.nextDate,
        isSubscription: dto.isSubscription || false,
        isActive: true,
      },
    });
  }

  async deleteRecurringTransaction(userId: string, id: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException(`Recurring transaction ${id} not found`);

    await this.prisma.recurringTransaction.delete({
      where: { id },
    });

    return { success: true };
  }

  // ==========================================
  // 7. ANALYTICS & CSV EXPORT
  // ==========================================
  async getFinanceAnalytics(userId: string, month?: string) {
    const currentMonth = month || new Date().toISOString().substring(0, 7); // "YYYY-MM"

    // Accounts Net Worth
    const accounts = await this.prisma.financeAccount.findMany({
      where: { userId },
    });
    const netWorth = accounts.reduce((acc, a) => acc.add(a.balance), new Prisma.Decimal(0));

    // Month Transactions
    const monthTransactions = await this.prisma.financeTransaction.findMany({
      where: {
        userId,
        date: { startsWith: currentMonth },
      },
      include: { category: true },
    });

    const monthIncome = monthTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0));

    const monthExpense = monthTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum.add(t.amount), new Prisma.Decimal(0));

    const netSavings = monthIncome.sub(monthExpense);
    const savingsRate = monthIncome.gt(0)
      ? Math.max(0, Math.round(netSavings.div(monthIncome).mul(100).toNumber()))
      : 0;

    // Spending by category
    const categoryMap = new Map<string, { name: string; amount: Prisma.Decimal; color: string }>();
    for (const t of monthTransactions.filter((x) => x.type === TransactionType.EXPENSE)) {
      const catName = t.category?.name || 'Uncategorized';
      const catColor = t.category?.color || '#8B45F5';
      const existing = categoryMap.get(catName) || { name: catName, amount: new Prisma.Decimal(0), color: catColor };
      existing.amount = existing.amount.add(t.amount);
      categoryMap.set(catName, existing);
    }

    const spendingByCategory = Array.from(categoryMap.values()).map((c) => ({
      name: c.name,
      amount: c.amount.toNumber(),
      color: c.color,
      percentage: monthExpense.gt(0)
        ? Math.round(c.amount.div(monthExpense).mul(100).toNumber())
        : 0,
    })).sort((a, b) => b.amount - a.amount);

    return {
      currentMonth,
      netWorth: netWorth.toNumber(),
      monthIncome: monthIncome.toNumber(),
      monthExpense: monthExpense.toNumber(),
      netSavings: netSavings.toNumber(),
      savingsRate,
      totalAccounts: accounts.length,
      transactionCount: monthTransactions.length,
      spendingByCategory,
    };
  }

  async exportTransactionsCsv(userId: string): Promise<string> {
    const transactions = await this.prisma.financeTransaction.findMany({
      where: { userId },
      include: { account: true, category: true },
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'Account', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'PaymentMethod', 'Notes'];
    const rows = transactions.map((t) => [
      t.date,
      `"${t.account.name.replace(/"/g, '""')}"`,
      t.type,
      `"${(t.category?.name || 'Uncategorized').replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toString(),
      t.currency,
      t.paymentMethod,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

