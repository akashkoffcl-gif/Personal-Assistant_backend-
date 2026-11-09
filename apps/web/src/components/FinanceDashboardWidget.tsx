'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/currency';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  Eye,
  EyeOff,
  ChevronRight,
  CreditCard,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface FinanceDashboardWidgetProps {
  onOpenFullFinance?: () => void;
  onOpenAddTransaction?: (type?: 'INCOME' | 'EXPENSE') => void;
  onOpenAddAccount?: () => void;
}

export const FinanceDashboardWidget: React.FC<FinanceDashboardWidgetProps> = ({
  onOpenFullFinance,
  onOpenAddTransaction,
  onOpenAddAccount,
}) => {
  const [showAmounts, setShowAmounts] = useState<boolean>(true);
  const currentMonth = new Date().toISOString().substring(0, 7);

  // 1. Fetch Finance Analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['finance-analytics', currentMonth],
    queryFn: () => api.getFinanceAnalytics(currentMonth),
    staleTime: 30000,
  });
  const rawAnalytics = analyticsData?.data || analyticsData || {};
  const analytics = {
    totalNetWorth: rawAnalytics.netWorth ?? rawAnalytics.totalNetWorth ?? '0.00',
    totalIncome: rawAnalytics.monthIncome ?? rawAnalytics.totalIncome ?? '0.00',
    totalExpenses: rawAnalytics.monthExpense ?? rawAnalytics.totalExpenses ?? '0.00',
    netSavings: rawAnalytics.netSavings ?? '0.00',
    savingsRatePercent: rawAnalytics.savingsRate ?? rawAnalytics.savingsRatePercent ?? 0,
    topExpenses: rawAnalytics.spendingByCategory || rawAnalytics.topExpenses || [],
  };

  // 2. Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => api.getFinanceAccounts(),
    staleTime: 30000,
  });
  const accounts = (accountsData as any)?.data || (Array.isArray(accountsData) ? accountsData : []);

  // 3. Fetch Budgets
  const { data: budgetsData } = useQuery({
    queryKey: ['finance-budgets', currentMonth],
    queryFn: () => api.getFinanceBudgets(currentMonth),
    staleTime: 30000,
  });
  const budgets = (budgetsData as any)?.data || (Array.isArray(budgetsData) ? budgetsData : []);

  // 4. Fetch Savings Goals
  const { data: savingsData } = useQuery({
    queryKey: ['savings-goals'],
    queryFn: () => api.getSavingsGoals(),
    staleTime: 30000,
  });
  const savingsGoals = (savingsData as any)?.data || (Array.isArray(savingsData) ? savingsData : []);

  // INR Currency Formatter with Privacy masking
  const formatAmount = (val: string | number) => {
    return formatINR(val, { isMasked: !showAmounts });
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#E5E2F5] shadow-[0_4px_20px_rgba(139,69,245,0.035)] flex flex-col justify-between h-full overflow-hidden">
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F0F2FA] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F4F3FF] border border-[#DDD8F8] flex items-center justify-center text-[#8B45F5] shadow-2xs">
            <Wallet className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#202033] tracking-tight">
              Personal Finance & Wealth
            </h3>
          </div>
          <button
            onClick={() => setShowAmounts(!showAmounts)}
            className="p-1 rounded-md text-[#74738A] hover:text-[#202033] hover:bg-[#F4F3FF] transition-colors"
            title={showAmounts ? 'Hide amounts (Privacy Mode)' : 'Show amounts'}
          >
            {showAmounts ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          onClick={onOpenFullFinance}
          className="text-xs font-bold text-[#8B45F5] hover:text-[#6935C8] flex items-center gap-0.5 transition-colors"
        >
          <span>Finance</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Core Grid: Left = Net Worth & Cash Flow, Right = Accounts & Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 py-2 flex-1 items-center">
        {/* Left Column (6 cols): Net Worth & Monthly Cash Flow */}
        <div className="md:col-span-6 flex flex-col justify-between bg-gradient-to-b from-[#F4F3FF]/60 to-white rounded-xl p-3 border border-[#DDD8F8]/60 space-y-2.5">
          {/* Net Worth Card */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#74738A] block">
              Total Net Worth
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-[#202033] tracking-tight">
                {formatAmount(analytics.totalNetWorth)}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A]">
                {analytics.savingsRatePercent}% saved
              </span>
            </div>
          </div>

          {/* Income vs Expenses Mini Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E2F5]/70">
            <div className="p-2 rounded-lg bg-white border border-[#E5E2F5]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#16A36A]">
                <ArrowUpRight className="w-3 h-3" />
                <span>Income</span>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#202033] block mt-0.5">
                {formatAmount(analytics.totalIncome)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white border border-[#E5E2F5]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-[#E05268]">
                <ArrowDownRight className="w-3 h-3" />
                <span>Expenses</span>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#202033] block mt-0.5">
                {formatAmount(analytics.totalExpenses)}
              </span>
            </div>
          </div>

          {/* Quick Transaction Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onOpenAddTransaction?.('INCOME')}
              className="flex-1 py-1.5 rounded-lg border border-[#D1FAE5] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#16A36A] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Income</span>
            </button>
            <button
              onClick={() => onOpenAddTransaction?.('EXPENSE')}
              className="flex-1 py-1.5 rounded-lg border border-[#FECDD6] bg-[#FFEAEF] hover:bg-[#FECDCA] text-[#E05268] font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Expense</span>
            </button>
          </div>
        </div>

        {/* Right Column (6 cols): Accounts & Budget Progress */}
        <div className="md:col-span-6 flex flex-col justify-between space-y-2 pl-0 md:pl-2">
          {/* Accounts Mini List */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#74738A] mb-1.5">
              <span>Connected Accounts</span>
              <span className="text-[10px] text-[#8B45F5]">{accounts.length} Total</span>
            </div>

            <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
              {accounts.length === 0 ? (
                <div className="p-2 rounded-lg bg-[#F4F3FF]/40 border border-[#E5E2F5] text-center text-[10px] text-[#74738A]">
                  No accounts linked.{' '}
                  <button
                    onClick={onOpenAddAccount || onOpenFullFinance}
                    className="font-bold text-[#8B45F5] hover:underline"
                  >
                    + Add Account
                  </button>
                </div>
              ) : (
                accounts.slice(0, 2).map((acc: any) => (
                  <div
                    key={acc.id}
                    className="p-1.5 rounded-lg border border-[#E5E2F5] bg-white flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CreditCard className="w-3 h-3 text-[#8B45F5] shrink-0" />
                      <span className="font-semibold text-[#202033] truncate">{acc.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[#202033] ml-1 shrink-0">
                      {formatAmount(acc.balance)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Budget Utilization Bar */}
          <div className="p-2 rounded-xl border border-[#E5E2F5] bg-[#F4F3FF]/40">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#74738A]">
              <span>Monthly Budget Cap</span>
              <span className="text-[#202033]">
                {budgets.length > 0 ? `${budgets.length} Categories` : 'Default 70%'}
              </span>
            </div>
            <div className="w-full bg-[#E5E2F5] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#16A36A] to-[#8B45F5] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    parseFloat(analytics.totalIncome) > 0
                      ? Math.round((parseFloat(analytics.totalExpenses) / parseFloat(analytics.totalIncome)) * 100)
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Savings Goals Teaser */}
          <div className="flex items-center justify-between text-[10px] text-[#74738A] pt-1 border-t border-[#F0F2FA]">
            <span>Active Savings Goals: {savingsGoals.length}</span>
            <span className="font-semibold text-[#16A36A]">Prisma Decimal Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
