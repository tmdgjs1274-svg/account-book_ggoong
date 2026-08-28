'use client';

import { useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import MonthSwitcher from '@/components/MonthSwitcher';
import TransactionFormSheet from '@/components/TransactionFormSheet';
import { useTransactions, useLedgerSettings, isDataKey } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatWon, formatDateLabel, currentMonthStr } from '@/lib/format';
import type { Transaction, CategoryType } from '@/types';

type FilterType = 'all' | CategoryType;

export default function TransactionsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const [filter, setFilter] = useState<FilterType>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { transactions, isLoading, mutate } = useTransactions(month);
  const { bothEnabled, settings } = useLedgerSettings();
  const { mutate: globalMutate } = useSWRConfig();

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      if (!map.has(t.occurred_on)) map.set(t.occurred_on, []);
      map.get(t.occurred_on)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === 'income') income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { income, expense };
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 거래를 삭제할까요?')) return;
    await api.del(`/api/transactions/${id}`);
    mutate();
    globalMutate((key) => isDataKey(key, '/api/stats'));
    globalMutate((key) => isDataKey(key, '/api/budgets'));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">거래 내역</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      {bothEnabled && (
        <div className="flex gap-2">
          {(
            [
              ['all', '전체'],
              ['expense', '지출'],
              ['income', '수입'],
            ] as [FilterType, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                filter === value ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {bothEnabled ? (
        <Card className="flex justify-around text-center">
          <div>
            <p className="text-xs text-ink-300">수입</p>
            <p className="text-base font-bold text-income">{formatWon(totals.income)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-300">지출</p>
            <p className="text-base font-bold text-expense">{formatWon(totals.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-300">합계</p>
            <p className="text-base font-bold text-ink-900">
              {formatWon(totals.income - totals.expense)}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center text-center">
          <p className="text-xs text-ink-300">{settings.expense_enabled ? '지출' : '수입'}</p>
          <p
            className={clsx(
              'text-base font-bold',
              settings.expense_enabled ? 'text-expense' : 'text-income'
            )}
          >
            {formatWon(settings.expense_enabled ? totals.expense : totals.income)}
          </p>
        </Card>
      )}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-ink-300">불러오는 중...</p>
      ) : grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-300">기록된 거래가 없어요</p>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date}>
            <p className="mb-2 px-1 text-xs font-semibold text-ink-300">
              {formatDateLabel(date)}
            </p>
            <Card className="divide-y divide-surface-border !p-0">
              {items.map((t) => (
                <div key={t.id} className="group flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: t.category?.color || '#B0B8C1' }}
                    />
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
                      {t.memo && <p className="text-xs text-ink-300">{t.memo}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={clsx(
                          'text-[10px] font-semibold',
                          t.type === 'income' ? 'text-income' : 'text-expense'
                        )}
                      >
                        {t.type === 'income' ? '수입' : '지출'}
                      </span>
                      <span className="text-sm font-semibold text-ink-900">
                        {formatWon(t.amount)}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setEditing(t);
                        setSheetOpen(true);
                      }}
                      className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}

      <TransactionFormSheet
        open={sheetOpen}
        initial={editing}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setSheetOpen(false);
          setEditing(null);
          mutate();
        }}
      />
    </div>
  );
}
