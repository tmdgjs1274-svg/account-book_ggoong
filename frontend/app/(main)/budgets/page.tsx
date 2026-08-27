'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import MonthSwitcher from '@/components/MonthSwitcher';
import { useBudgets, useCategories } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatWon, currentMonthStr } from '@/lib/format';
import type { Category } from '@/types';

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthStr());
  const { budgets, mutate } = useBudgets(month);
  const { categories } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]));

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink-900">예산</h1>
          <Link
            href="/categories"
            className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink-500"
          >
            카테고리 관리
          </Link>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>

      <Card>
        <p className="text-xs text-ink-300">이번 달 전체 예산 사용률</p>
        <p className="mt-1 text-2xl font-extrabold text-ink-900">
          {formatWon(totalSpent)}{' '}
          <span className="text-sm font-medium text-ink-300">/ {formatWon(totalBudget)}</span>
        </p>
        <div className="mt-3">
          <ProgressBar rate={totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0} />
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {expenseCategories.map((c) => {
          const budget = budgetByCategory.get(c.id);
          return (
            <Card key={c.id} className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.name.slice(0, 1)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                    {budget && (
                      <span className="text-xs text-ink-500">
                        {formatWon(budget.spent)} / {formatWon(budget.amount)}
                      </span>
                    )}
                  </div>
                  {budget ? (
                    <div className="mt-2">
                      <ProgressBar rate={budget.usage_rate} color={c.color} />
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-ink-300">예산이 설정되지 않았어요</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditingCategory(c)}
                className="shrink-0 rounded-xl bg-surface-alt px-3 py-2 text-xs font-semibold text-ink-500"
              >
                {budget ? '수정' : '설정'}
              </button>
            </Card>
          );
        })}
      </div>

      {editingCategory && (
        <BudgetEditSheet
          category={editingCategory}
          month={month}
          currentAmount={budgetByCategory.get(editingCategory.id)?.amount}
          onClose={() => setEditingCategory(null)}
          onSaved={() => {
            setEditingCategory(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function BudgetEditSheet({
  category,
  month,
  currentAmount,
  onClose,
  onSaved,
}: {
  category: Category;
  month: string;
  currentAmount?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(currentAmount ? String(currentAmount) : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post('/api/budgets', {
        category_id: category.id,
        month,
        amount: Number(amount) || 0,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">{category.name} 예산</h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>
        <div className="mb-6 flex items-center rounded-2xl border border-surface-border bg-surface-alt px-4">
          <input
            inputMode="numeric"
            placeholder="0"
            value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            className="h-14 flex-1 bg-transparent text-xl font-bold text-ink-900 outline-none"
          />
          <span className="text-base font-medium text-ink-500">원</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
