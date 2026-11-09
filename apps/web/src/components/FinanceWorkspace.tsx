'use client';

import React, { useState } from 'react';
import { formatINR } from '@/lib/currency';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { format } from 'date-fns';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  PiggyBank,
  Plus,
  Download,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const FinanceWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [currentMonth, setCurrentMonth] = useState<string>(() =>
    new Date().toISOString().substring(0, 7),
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [transactionSearch, setTransactionSearch] = useState('');

  // Modals state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);

  // 1. Queries
  const { data: analyticsData } = useQuery({
    queryKey: ['finance-analytics', currentMonth],
    queryFn: () => api.getFinanceAnalytics(currentMonth),
  });
  const analytics = analyticsData || {
    netWorth: 0,
    monthIncome: 0,
    monthExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    totalAccounts: 0,
    transactionCount: 0,
    spendingByCategory: [],
  };

  const { data: accountsData } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => api.getFinanceAccounts(),
  });
  const accounts = accountsData || [];

  const { data: categoriesData } = useQuery({
    queryKey: ['finance-categories'],
    queryFn: () => api.getFinanceCategories(),
  });
  const categories = categoriesData || [];

  const { data: budgetsData } = useQuery({
    queryKey: ['finance-budgets', currentMonth],
    queryFn: () => api.getFinanceBudgets(currentMonth),
  });
  const budgets = budgetsData || [];

  const { data: savingsData } = useQuery({
    queryKey: ['finance-savings'],
    queryFn: () => api.getSavingsGoals(),
  });
  const savingsGoals = savingsData || [];

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['finance-transactions', currentMonth, selectedAccountId, selectedType],
    queryFn: () =>
      api.getFinanceTransactions({
        month: currentMonth,
        accountId: selectedAccountId !== 'ALL' ? selectedAccountId : undefined,
        type: selectedType !== 'ALL' ? (selectedType as any) : undefined,
        limit: 100,
      }),
  });
  const rawTransactions = transactionsData || [];
  const transactions = transactionSearch
    ? rawTransactions.filter(
        (t: any) =>
          t.description?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
          t.notes?.toLowerCase().includes(transactionSearch.toLowerCase()),
      )
    : rawTransactions;

  // 2. Mutations
  const createTransactionMutation = useMutation({
    mutationFn: (data: any) => api.createFinanceTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      toast.success('Transaction Logged', 'Account balance adjusted.');
      setIsTransactionModalOpen(false);
    },
    onError: (err: any) => toast.error('Transaction Failed', err?.message),
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => api.deleteFinanceTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      toast.info('Transaction Deleted', 'Account balance restored.');
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => api.createFinanceAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-analytics'] });
      toast.success('Account Created');
      setIsAccountModalOpen(false);
    },
  });

  const setBudgetMutation = useMutation({
    mutationFn: (data: any) => api.setFinanceBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      toast.success('Budget Set');
      setIsBudgetModalOpen(false);
    },
  });

  const createSavingsGoalMutation = useMutation({
    mutationFn: (data: any) => api.createSavingsGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-savings'] });
      toast.success('Savings Goal Created');
      setIsSavingsModalOpen(false);
    },
  });

  const contributeGoalMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.contributeSavingsGoal(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-savings'] });
      toast.success('Contribution Recorded', 'Savings milestone updated.');
      setContributeGoalId(null);
    },
  });

  const formatCurrency = (val: number | string) => {
    return formatINR(val);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B45F5] bg-[#F4F3FF] px-2.5 py-0.5 rounded-full border border-[#E5E2F5]">
              Phase 30 • Personal Finance
            </span>
            <span className="text-xs text-[#74738A] font-semibold">Decimal Precision & Strict Accounting</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#202033] tracking-tight">
            Personal Finance & Wealth Management
          </h2>
          <p className="text-xs text-[#74738A] mt-0.5">
            Monitor real net worth, monthly cash flow, budget limits, savings goals, and transaction journals.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold border border-[#E5E2F5] rounded-xl bg-white text-[#202033] shadow-2xs"
          />

          {/* CSV Export */}
          <button
            onClick={() => {
              window.open('/api/v1/finance/export/csv', '_blank');
              toast.info('Downloading CSV export...');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-[#202033] bg-[#F4F3FF] hover:bg-[#EAE9FF] rounded-xl border border-[#E5E2F5] transition-colors flex items-center gap-1.5"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add Account */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#8B45F5] bg-[#F4F3FF] hover:bg-[#EAE9FF] rounded-xl border border-[#E5E2F5] transition-colors flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>+ Account</span>
          </button>

          {/* Add Transaction */}
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Total Net Worth
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-[#202033]">
                {formatCurrency(analytics.netWorth)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#EAFBF1] text-[#10B981] flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Monthly Income
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-[#10B981]">
                {formatCurrency(analytics.monthIncome)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#E05268] flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Monthly Expenses
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-[#E05268]">
                {formatCurrency(analytics.monthExpense)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5E2F5] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F4F3FF] text-[#8B45F5] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-[#74738A] uppercase tracking-wider block">
              Savings Rate
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-black text-[#202033]">{analytics.savingsRate}%</span>
              <div className="flex-1 bg-[#F4F3FF] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#8B45F5] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, analytics.savingsRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACCOUNTS OVERVIEW CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#8B45F5]" />
            Accounts & Balances ({accounts.length})
          </h3>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="text-xs font-bold text-[#8B45F5] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-[#E5E2F5]">
            <p className="text-xs text-[#74738A]">No bank or cash accounts connected.</p>
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="mt-2 px-3 py-1 text-xs font-bold text-white bg-[#8B45F5] rounded-xl"
            >
              Add First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {accounts.map((acc: any) => (
              <div
                key={acc.id}
                className="bg-white rounded-2xl border border-[#E5E2F5] p-4 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: acc.color || '#8B45F5' }}
                />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#8B45F5]">
                      {acc.type}
                    </span>
                    <h4 className="text-sm font-bold text-[#202033] mt-1.5 tracking-tight truncate">
                      {acc.name}
                    </h4>
                  </div>
                  {acc.isDefault && (
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#EAFBF1] px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-[#74738A] block">Available Balance</span>
                  <span className="text-lg font-black text-[#202033] font-mono">
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. BUDGETS & SAVINGS GOALS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Monthly Budgets */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#8B45F5]" />
              <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider">
                Monthly Budgets ({currentMonth})
              </h3>
            </div>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="text-xs font-bold text-[#8B45F5] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Set Budget
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#74738A] border border-dashed border-[#E5E2F5] rounded-xl">
              No category limits configured for {currentMonth}.
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="block mx-auto mt-2 text-xs font-bold text-[#8B45F5] hover:underline"
              >
                Create a budget limit
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((b: any) => (
                <div key={b.id} className="p-3 rounded-xl bg-[#F4F3FF]/50 border border-[#E5E2F5] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#202033]">{b.category?.name || 'Category'}</span>
                    <span className="font-semibold text-[#74738A]">
                      {formatCurrency(b.spentAmount)} / {formatCurrency(b.allocatedAmount)}
                    </span>
                  </div>

                  <div className="w-full bg-[#E5E2F5] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.isOverBudget ? 'bg-[#E05268]' : 'bg-[#8B45F5]'
                      }`}
                      style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-semibold ${b.isOverBudget ? 'text-[#E05268]' : 'text-[#74738A]'}`}
                    >
                      {b.isOverBudget
                        ? `Over limit by ${formatCurrency(b.spentAmount - b.allocatedAmount)}`
                        : `${formatCurrency(b.remainingAmount)} remaining`}
                    </span>
                    <span className="font-mono font-bold text-[#202033]">{b.percentUsed}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Savings Goals */}
        <div className="bg-white rounded-2xl p-5 border border-[#E5E2F5] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider">
                Savings Goals
              </h3>
            </div>
            <button
              onClick={() => setIsSavingsModalOpen(true)}
              className="text-xs font-bold text-[#10B981] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              New Goal
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#74738A] border border-dashed border-[#E5E2F5] rounded-xl">
              No savings targets established.
              <button
                onClick={() => setIsSavingsModalOpen(true)}
                className="block mx-auto mt-2 text-xs font-bold text-[#10B981] hover:underline"
              >
                Create your first savings goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {savingsGoals.map((sg: any) => {
                const target = Number(sg.targetAmount) || 1;
                const current = Number(sg.currentAmount) || 0;
                const progress = Math.min(100, Math.round((current / target) * 100));
                const isCompleted = current >= target;

                return (
                  <div key={sg.id} className="p-3 rounded-xl bg-[#EAFBF1]/40 border border-[#A7F3D0] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#202033]">{sg.name}</span>
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-[#10B981] bg-white px-2 py-0.5 rounded-full border border-[#10B981]">
                            100% Achieved
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setContributeGoalId(sg.id)}
                        className="px-2 py-1 text-[11px] font-bold text-[#10B981] bg-white hover:bg-[#EAFBF1] rounded-lg border border-[#A7F3D0] transition-colors"
                      >
                        + Add Funds
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#10B981]">{formatCurrency(current)}</span>
                      <span className="text-[#74738A]">Target: {formatCurrency(target)}</span>
                    </div>

                    <div className="w-full bg-[#E5E2F5] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. TRANSACTIONS LOG TABLE */}
      <div className="bg-white rounded-2xl border border-[#E5E2F5] shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-[#E5E2F5] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#8B45F5]" />
            <h3 className="text-sm font-bold text-[#202033] uppercase tracking-wider">
              Transactions Journal ({transactions.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#74738A]" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-medium border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
              />
            </div>

            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
            >
              <option value="ALL">All Accounts</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income Only</option>
              <option value="EXPENSE">Expenses Only</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {transactionsLoading ? (
          <div className="p-12 text-center text-xs text-[#74738A]">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#74738A]">
            No transactions found for this period. Click &apos;+ Transaction&apos; to log one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F3FF] text-[#74738A] uppercase tracking-wider text-[10px] font-extrabold border-b border-[#E5E2F5]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2F5]">
                {transactions.map((t: any) => {
                  const isIncome = t.type === 'INCOME';
                  return (
                    <tr key={t.id} className="hover:bg-[#F4F3FF]/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[#74738A]">{t.date}</td>
                      <td className="py-3 px-4 font-bold text-[#202033]">
                        {t.description}
                        {t.notes && <span className="block text-[11px] font-normal text-[#74738A]">{t.notes}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F4F3FF] text-[#8B45F5]">
                          {t.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#202033]">{t.account?.name}</td>
                      <td className="py-3 px-4 text-[#74738A] font-semibold">{t.paymentMethod}</td>
                      <td
                        className={`py-3 px-4 text-right font-black font-mono ${
                          isIncome ? 'text-[#10B981]' : 'text-[#202033]'
                        }`}
                      >
                        {isIncome ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(t.amount)}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Delete this transaction? The account balance will be reverted.')) {
                              deleteTransactionMutation.mutate(t.id);
                            }
                          }}
                          className="p-1 text-[#74738A] hover:text-[#E05268] rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. CREATE TRANSACTION MODAL */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2F5]">
              <h3 className="text-base font-bold text-[#202033]">Log Financial Transaction</h3>
              <button
                onClick={() => setIsTransactionModalOpen(false)}
                className="text-xs text-[#74738A] hover:text-[#202033] font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const accountId = (form.elements.namedItem('accountId') as HTMLSelectElement).value;
                const categoryId = (form.elements.namedItem('categoryId') as HTMLSelectElement).value || undefined;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value);
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const description = (form.elements.namedItem('description') as HTMLInputElement).value;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;
                const paymentMethod = (form.elements.namedItem('paymentMethod') as HTMLSelectElement).value;

                createTransactionMutation.mutate({
                  accountId,
                  categoryId,
                  type,
                  amount,
                  date,
                  description,
                  notes: notes || undefined,
                  paymentMethod,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Type *</label>
                  <select
                    name="type"
                    defaultValue="EXPENSE"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="EXPENSE">Expense (-)</option>
                    <option value="INCOME">Income (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Amount (₹) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Description / Payee *</label>
                <input
                  name="description"
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Hosting or Client Retainer"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Account *</label>
                  <select
                    name="accountId"
                    required
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Category</label>
                  <select
                    name="categoryId"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Transaction Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().substring(0, 10)}
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#202033] mb-1">Payment Method</label>
                  <select
                    name="paymentMethod"
                    defaultValue="CARD"
                    className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                  >
                    <option value="CARD">Card / Debit</option>
                    <option value="TRANSFER">Bank Transfer / ACH</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Memo / Notes</label>
                <input
                  name="notes"
                  type="text"
                  placeholder="Optional receipt details or tags"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E2F5] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#74738A] hover:bg-[#F4F3FF] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#8B45F5] hover:bg-[#7839D6] rounded-xl shadow-xs"
                >
                  {createTransactionMutation.isPending ? 'Saving...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CREATE ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Add Financial Account</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value;
                const initialBalance = Number((form.elements.namedItem('initialBalance') as HTMLInputElement).value) || 0;
                const color = (form.elements.namedItem('color') as HTMLInputElement).value;

                createAccountMutation.mutate({ name, type, initialBalance, color });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Account Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Chase Main Checking"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Type</label>
                <select
                  name="type"
                  defaultValue="CHECKING"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  <option value="CHECKING">Checking</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="CREDIT">Credit Card</option>
                  <option value="INVESTMENT">Investment / Brokerage</option>
                  <option value="CASH">Cash Wallet</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Starting Balance (₹)</label>
                <input
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  defaultValue="0.00"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Color Theme</label>
                <input
                  name="color"
                  type="color"
                  defaultValue="#8B45F5"
                  className="w-8 h-8 rounded-lg cursor-pointer border border-[#E5E2F5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. SET BUDGET MODAL */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Configure Category Budget</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const categoryId = (form.elements.namedItem('categoryId') as HTMLSelectElement).value;
                const allocatedAmount = Number((form.elements.namedItem('allocatedAmount') as HTMLInputElement).value);
                setBudgetMutation.mutate({ categoryId, month: currentMonth, allocatedAmount });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Category *</label>
                <select
                  name="categoryId"
                  required
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                >
                  {categories
                    .filter((c: any) => c.type === 'EXPENSE')
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Monthly Spending Limit (₹) *</label>
                <input
                  name="allocatedAmount"
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="500"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#8B45F5] rounded-xl"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. CREATE SAVINGS GOAL MODAL */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Establish Savings Goal</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const targetAmount = Number((form.elements.namedItem('targetAmount') as HTMLInputElement).value);
                const initialAmount = Number((form.elements.namedItem('initialAmount') as HTMLInputElement).value) || 0;
                createSavingsGoalMutation.mutate({ name, targetAmount, initialAmount });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Goal Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund (6 Months)"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Target Amount (₹) *</label>
                <input
                  name="targetAmount"
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#202033] mb-1">Initial Balance (₹)</label>
                <input
                  name="initialAmount"
                  type="number"
                  step="1"
                  defaultValue="0"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSavingsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] rounded-xl"
                >
                  Establish Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. CONTRIBUTE SAVINGS MODAL */}
      {contributeGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full border border-[#E5E2F5] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#202033]">Add Funds to Goal</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value);
                if (amount > 0) {
                  contributeGoalMutation.mutate({ id: contributeGoalId, amount });
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#202033] mb-1">Contribution Amount (₹) *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="100.00"
                  className="w-full px-3 py-2 border border-[#E5E2F5] rounded-xl bg-white text-[#202033] font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setContributeGoalId(null)}
                  className="px-3 py-1.5 text-xs text-[#74738A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] rounded-xl"
                >
                  Add Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

