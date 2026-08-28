'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useCategories, useSpenders, useLedgerSettings, isDataKey } from '@/lib/hooks';
import type { Transaction, CategoryType } from '@/types';
import { useSWRConfig } from 'swr';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Transaction | null;
}

export default function TransactionFormSheet({ open, onClose, onSaved, initial }: Props) {
  const { categories } = useCategories();
  const { spenders } = useSpenders();
  const { bothEnabled, forcedType } = useLedgerSettings();
  const { mutate } = useSWRConfig();

  const [type, setType] = useState<CategoryType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [spenderId, setSpenderId] = useState<string | null>(null);
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setType(initial.type);
      setAmount(String(initial.amount));
      setCategoryId(initial.category_id);
      setSpenderId(initial.spender_id);
      setOccurredOn(initial.occurred_on);
      setMemo(initial.memo || '');
    } else {
      setType(forcedType || 'expense');
      setAmount('');
      setCategoryId(null);
      setSpenderId(null);
      setOccurredOn(new Date().toISOString().slice(0, 10));
      setMemo('');
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // 수입 또는 지출 중 하나만 쓰는 설정이면, 새 거래를 추가할 때 다른 유형을 고를 수 없어요.
  useEffect(() => {
    if (open && !initial && forcedType) setType(forcedType);
  }, [open, initial, forcedType]);

  const filteredCategories = categories.filter((c) => c.type === type);

  if (!open) return null;

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '');
    setAmount(digits);
  };

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('금액을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        amount: Number(amount),
        category_id: categoryId,
        spender_id: spenderId,
        occurred_on: occurredOn,
        memo: memo || null,
      };
      if (initial) {
        await api.put(`/api/transactions/${initial.id}`, payload);
      } else {
        await api.post('/api/transactions', payload);
      }
      mutate((key) => isDataKey(key, '/api/transactions'));
      mutate((key) => isDataKey(key, '/api/stats'));
      mutate((key) => isDataKey(key, '/api/budgets'));
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
          <h2 className="text-lg font-bold text-ink-900">
            {initial ? '가계부 수정' : '가계부 추가'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>

        {/* 수입/지출 토글 (둘 다 사용 중일 때만 보여요) */}
        {bothEnabled && (
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
        )}

        {/* 금액 */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">금액</label>
          <div className="flex items-center rounded-2xl border border-surface-border bg-white px-4">
            <input
              inputMode="numeric"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="h-14 flex-1 bg-transparent text-xl font-bold text-ink-900 outline-none"
            />
            <span className="text-base font-medium text-ink-500">원</span>
          </div>
        </div>

        {/* 카테고리 */}
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

        {/* 구성원 (누가 소비했는지) */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">구성원 (선택)</label>
          {spenders.length === 0 ? (
            <p className="text-xs text-ink-300">
              등록된 구성원이 없어요. 가계부 설정 &gt; 구성원 관리에서 추가할 수 있어요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSpenderId(null)}
                className={clsx(
                  'rounded-full border px-3 py-2 text-sm font-medium transition',
                  spenderId === null
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-surface-border text-ink-500'
                )}
              >
                미지정
              </button>
              {spenders
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpenderId(s.id)}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition',
                      spenderId === s.id
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-surface-border text-ink-500'
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 날짜 */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">날짜</label>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="h-12 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* 메모 */}
        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-ink-500">메모 (선택)</label>
          <input
            type="text"
            placeholder="예: 점심 식사"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-12 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="mb-3 text-sm text-expense">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? '저장 중...' : initial ? '수정하기' : '추가하기'}
        </button>
      </div>
    </div>
  );
}
