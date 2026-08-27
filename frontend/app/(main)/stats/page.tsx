'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { getDaysInMonth, getDay, parseISO } from 'date-fns';
import Card from '@/components/Card';
import MonthSwitcher from '@/components/MonthSwitcher';
import DonutChart from '@/components/DonutChart';
import TrendBarChart from '@/components/TrendBarChart';
import { useBreakdown, useTrend, useTransactions } from '@/lib/hooks';
import { formatWon, currentMonthStr } from '@/lib/format';
import type { CategoryType, Transaction } from '@/types';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StatsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [type, setType] = useState<CategoryType>('expense');
  const { breakdown, isLoading } = useBreakdown(month, type);
  const { trend } = useTrend(6);
  const { transactions } = useTransactions(month);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-900">통계</h1>

      {/* 최근 6개월 추이 - 월 선택과 무관하게 항상 최근 6개월 고정이라 월 전환 UI가 필요 없어요 */}
      <Card>
        <h2 className="mb-3 text-base font-bold text-ink-900">최근 6개월 추이</h2>
        <TrendBarChart data={trend} />
        <div className="mt-2 flex justify-center gap-5 text-xs text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-income" /> 수입
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-expense" /> 지출
          </span>
        </div>
      </Card>

      {/* 아래 두 영역(비중, 일별 캘린더)은 이 월 선택을 같이 따라가요 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-ink-900">월별 상세</h2>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <Card>
        <div className="mb-4 flex rounded-2xl bg-surface-alt p-1">
          {(['expense', 'income'] as CategoryType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={clsx(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
                type === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-300'
              )}
            >
              {t === 'expense' ? '지출' : '수입'} 비중
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-ink-300">불러오는 중...</p>
        ) : (
          <>
            <DonutChart data={breakdown?.categories || []} />
            <div className="mt-4 flex flex-col gap-3">
              {(breakdown?.categories || []).map((c) => (
                <div key={c.category_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-ink-700">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-ink-500">{formatWon(c.amount)}</span>
                    <span className="w-10 text-right font-semibold text-ink-900">
                      {c.percent}%
                    </span>
                  </div>
                </div>
              ))}
              {breakdown?.categories.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-300">기록된 내역이 없어요</p>
              )}
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold text-ink-900">일별 내역</h2>
        <MonthCalendar month={month} transactions={transactions} />
      </Card>
    </div>
  );
}

function MonthCalendar({ month, transactions }: { month: string; transactions: Transaction[] }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthDate = parseISO(`${month}-01`);
  const daysInMonth = getDaysInMonth(monthDate);
  const firstWeekday = getDay(monthDate); // 0(일) ~ 6(토)
  const todayStr = new Date().toISOString().slice(0, 10);

  const byDay = useMemo(() => {
    const map = new Map<string, { expense: number; income: number }>();
    for (const t of transactions) {
      const entry = map.get(t.occurred_on) || { expense: 0, income: 0 };
      if (t.type === 'expense') entry.expense += Number(t.amount);
      else entry.income += Number(t.amount);
      map.set(t.occurred_on, entry);
    }
    return map;
  }, [transactions]);

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, dateStr: `${month}-${String(day).padStart(2, '0')}` });
  }

  const selectedTransactions = selectedDay
    ? transactions
        .filter((t) => t.occurred_on === selectedDay)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-300">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />;
          const data = byDay.get(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDay;
          const hasData = !!data && (data.expense > 0 || data.income > 0);
          return (
            <button
              key={cell.dateStr}
              onClick={() => hasData && setSelectedDay(isSelected ? null : cell.dateStr)}
              className={clsx(
                'flex min-h-[58px] flex-col items-center rounded-xl border py-1.5 text-left transition',
                isSelected
                  ? 'border-primary bg-primary-50'
                  : 'border-transparent hover:bg-surface-alt',
                !hasData && 'cursor-default'
              )}
            >
              <span
                className={clsx(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                  isToday ? 'bg-primary text-white' : 'text-ink-500'
                )}
              >
                {cell.day}
              </span>
              <span className="mt-1 flex flex-col items-center gap-0.5 text-[10px] leading-tight">
                {data && data.expense > 0 && <span className="text-expense">-{formatCompact(data.expense)}</span>}
                {data && data.income > 0 && <span className="text-income">+{formatCompact(data.income)}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 border-t border-surface-border pt-4">
          <p className="mb-2 text-xs font-semibold text-ink-500">
            {Number(selectedDay.slice(5, 7))}월 {Number(selectedDay.slice(8, 10))}일 내역
          </p>
          {selectedTransactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-300">이 날 기록된 거래가 없어요</p>
          ) : (
            <ul className="flex flex-col divide-y divide-surface-border">
              {selectedTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-ink-900">{t.category?.name || '미분류'}</p>
                      {t.author_email && (
                        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-medium text-ink-500">
                          {t.author_email.split('@')[0]}
                        </span>
                      )}
                    </div>
                    {t.memo && <p className="text-xs text-ink-300">{t.memo}</p>}
                  </div>
                  <span
                    className={clsx(
                      'font-semibold',
                      t.type === 'income' ? 'text-income' : 'text-ink-900'
                    )}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {formatWon(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// 캘린더 칸은 좁아서 "1,234,000원" 대신 "123만원" 같은 축약 표기를 씁니다.
function formatCompact(amount: number): string {
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${man % 1 === 0 ? man.toFixed(0) : man.toFixed(1)}만`;
  }
  return amount.toLocaleString('ko-KR');
}
