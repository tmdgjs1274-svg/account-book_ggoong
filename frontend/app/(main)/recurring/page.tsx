'use client';

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import { useRecurring, useCategories } from '@/lib/hooks';
import { api } from '@/lib/api';
import { formatWon } from '@/lib/format';
import type { CategoryType } from '@/types';

export default function RecurringPage() {
  const { recurrings, mutate } = useRecurring();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('이 반복 거래를 삭제할까요?')) return;
    await api.del(`/api/recurring/${id}`);
    mutate();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await api.put(`/api/recurring/${id}`, { is_active: !isActive });
    mutate();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">반복 거래</h1>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> 추가
        </button>
      </div>

      <p className="text-sm text-ink-500">
        매달 고정적으로 발생하는 수입/지출을 등록해두면 해당 날짜에 자동으로 거래가 기록돼요.
      </p>

      {recurrings.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-300">
          등록된 반복 거래가 없어요
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {recurrings.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: r.category?.color || '#B0B8C1' }}
                >
                  {(r.category?.name || '기타').slice(0, 1)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {r.category?.name || '미분류'} · 매달 {r.day_of_month}일
                  </p>
                  <p
                    className={clsx(
                      'text-sm font-semibold',
                      r.type === 'income' ? 'text-income' : 'text-ink-700'
                    )}
                  >
                    {r.type === 'income' ? '+' : '-'}
                    {formatWon(r.amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(r.id, r.is_active)}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-xs font-semibold',
                    r.is_active ? 'bg-primary-50 text-primary' : 'bg-surface-alt text-ink-300'
                  )}
                >
                  {r.is_active ? '사용중' : '중지됨'}
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RecurringFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          mutate();
        }}
      />
    </div>
  );
}

function RecurringFormSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { categories } = useCategories();
  const [type, setType] = useState<CategoryType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async () => {
    const day = Number(dayOfMonth);
    if (!amount || Number(amount) <= 0) {
      setError('금액을 입력해주세요.');
      return;
    }
    if (!day || day < 1 || day > 28) {
      setError('날짜는 1일에서 28일 사이로 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/recurring', {
        type,
        amount: Number(amount),
        category_id: categoryId,
        day_of_month: day,
        memo: memo || null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">반복 거래 추가</h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>

        <div className="mb-4 flex rounded-2xl bg-surface-alt p-1">
          {(['expense', 'income'] as CategoryType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCategoryId(null);
              }}
              className={clsx(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
                type === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-300'
              )}
            >
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">금액</label>
          <div className="flex items-center rounded-2xl border border-surface-border bg-surface-alt px-4">
            <input
              inputMode="numeric"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="h-14 flex-1 bg-transparent text-xl font-bold text-ink-900 outline-none"
            />
            <span className="text-base font-medium text-ink-500">원</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={clsx(
                  'rounded-full border px-3 py-2 text-sm font-medium transition',
                  categoryId === c.id
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-surface-border text-ink-500'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">매달 반복 날짜</label>
          <input
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="h-12 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-ink-500">메모 (선택)</label>
          <input
            type="text"
            placeholder="예: 월세"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-12 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="mb-3 text-sm text-expense">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중...' : '추가하기'}
        </button>
      </div>
    </div>
  );
}
