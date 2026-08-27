'use client';

import { useState } from 'react';
import clsx from 'clsx';
import Card from '@/components/Card';
import MonthSwitcher from '@/components/MonthSwitcher';
import DonutChart from '@/components/DonutChart';
import TrendBarChart from '@/components/TrendBarChart';
import { useBreakdown, useTrend } from '@/lib/hooks';
import { formatWon, currentMonthStr } from '@/lib/format';
import type { CategoryType } from '@/types';

export default function StatsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [type, setType] = useState<CategoryType>('expense');
  const { breakdown, isLoading } = useBreakdown(month, type);
  const { trend } = useTrend(6);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">통계</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

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
    </div>
  );
}
