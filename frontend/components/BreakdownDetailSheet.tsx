'use client';

import { X } from 'lucide-react';
import clsx from 'clsx';
import { formatWon, formatDateLabel } from '@/lib/format';
import type { Transaction } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  color: string;
  amount: number;
  groupBy: 'category' | 'spender';
  transactions: Transaction[];
}

// 통계 화면의 "월별 상세"에서 카테고리(또는 구매자)를 눌렀을 때, 그 항목에
// 해당하는 거래만 모아 보여주는 팝업 시트예요. 화면 전환 없이 바로바로
// 다른 항목도 눌러볼 수 있게 하기 위한 구조예요.
export default function BreakdownDetailSheet({
  open,
  onClose,
  title,
  color,
  amount,
  groupBy,
  transactions,
}: Props) {
  if (!open) return null;

  const sorted = [...transactions].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? b.created_at.localeCompare(a.created_at)
      : b.occurred_on.localeCompare(a.occurred_on)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="truncate text-lg font-bold text-ink-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-ink-300 hover:bg-surface-alt"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-alt px-4 py-3">
          <span className="text-sm text-ink-500">합계</span>
          <span className="text-lg font-bold text-ink-900">{formatWon(amount)}</span>
        </div>

        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-300">기록된 거래가 없어요</p>
        ) : (
          <ul className="flex-1 divide-y divide-surface-border overflow-y-auto">
            {sorted.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {groupBy === 'spender' ? (
                      <>
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: t.category?.color || '#B0B8C1' }}
                        />
                        <p className="truncate text-sm font-medium text-ink-900">
                          {t.category?.name || '미분류'}
                        </p>
                      </>
                    ) : t.spender ? (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: t.spender.color }}
                      >
                        {t.spender.name}
                      </span>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink-500">미지정</p>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-300">
                    {formatDateLabel(t.occurred_on)}
                    {t.memo && <span> · {t.memo}</span>}
                  </p>
                </div>
                <span
                  className={clsx(
                    'shrink-0 whitespace-nowrap text-sm font-semibold',
                    t.type === 'income' ? 'text-income' : 'text-ink-900'
                  )}
                >
                  {formatWon(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
