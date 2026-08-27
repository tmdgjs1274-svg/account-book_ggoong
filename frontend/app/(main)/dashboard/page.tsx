'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp, ChevronRight } from 'lucide-react';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import MonthSwitcher from '@/components/MonthSwitcher';
import DonutChart from '@/components/DonutChart';
import { useSummary, useBudgets, useBreakdown, useTransactions } from '@/lib/hooks';
import { formatWon, formatDateLabel, currentMonthStr } from '@/lib/format';

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const { summary, isLoading: summaryLoading } = useSummary(month);
  const { budgets } = useBudgets(month);
  const { breakdown } = useBreakdown(month, 'expense');
  const { transactions } = useTransactions(month);

  const topBudgets = [...budgets].sort((a, b) => b.usage_rate - a.usage_rate).slice(0, 3);
  const recentTransactions = transactions.slice(0, 5);
  const topCategories = breakdown?.categories.slice(0, 6) || [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">홈</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {/* 요약 카드 */}
      <Card className="bg-gradient-to-br from-primary to-primary-600 text-white">
        <p className="text-sm text-white/80">이번 달 요약</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-white/70">순잔액</p>
            <p className="mt-1 text-xl font-bold">
              {summaryLoading ? '...' : formatWon(summary?.balance || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/70">수입</p>
            <p className="mt-1 text-xl font-bold">{formatWon(summary?.income || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">지출</p>
            <p className="mt-1 text-xl font-bold">{formatWon(summary?.expense || 0)}</p>
          </div>
        </div>
        {summary?.expense_change_rate !== null && summary?.expense_change_rate !== undefined && (
          <div className="mt-4 flex items-center gap-1 text-xs text-white/80">
            {summary.expense_change_rate >= 0 ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            전월 대비 지출 {Math.abs(summary.expense_change_rate)}%{' '}
            {summary.expense_change_rate >= 0 ? '증가' : '감소'}
          </div>
        )}
      </Card>

      {/* 카테고리별 지출 비중 */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">카테고리별 지출</h2>
          <Link href="/stats" className="flex items-center text-xs text-ink-300">
            자세히 <ChevronRight size={14} />
          </Link>
        </div>
        <DonutChart data={topCategories} />
        {topCategories.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {topCategories.map((c) => (
              <div key={c.category_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="font-medium text-ink-700">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-ink-500">{formatWon(c.amount)}</span>
                  <span className="w-10 text-right font-semibold text-ink-900">{c.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 예산 현황 */}
      {topBudgets.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">예산 현황</h2>
            <Link href="/budgets" className="flex items-center text-xs text-ink-300">
              전체보기 <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {topBudgets.map((b) => (
              <div key={b.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{b.category.name}</span>
                  <span className="text-ink-500">
                    {formatWon(b.spent)} / {formatWon(b.amount)}
                  </span>
                </div>
                <ProgressBar rate={b.usage_rate} color={b.category.color} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 최근 거래 */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">최근 거래</h2>
          <Link href="/transactions" className="flex items-center text-xs text-ink-300">
            전체보기 <ChevronRight size={14} />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-300">아직 기록된 거래가 없어요</p>
        ) : (
          <ul className="flex flex-col divide-y divide-surface-border">
            {recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-ink-900">
                      {t.category?.name || '미분류'}
                    </p>
                    {t.spender && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: t.spender.color }}
                      >
                        {t.spender.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-300">{formatDateLabel(t.occurred_on)}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'income' ? 'text-income' : 'text-ink-900'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatWon(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
