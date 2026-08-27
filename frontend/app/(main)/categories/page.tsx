'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import { useCategories, isDataKey } from '@/lib/hooks';
import { useGroupContext } from '@/lib/group-context';
import { api } from '@/lib/api';
import type { Category, CategoryType } from '@/types';

const COLOR_PALETTE = [
  '#FF6B6B',
  '#F5A623',
  '#4A90D9',
  '#7B61FF',
  '#FF8FB1',
  '#2FCB8C',
  '#5BC8F2',
  '#9B7BFF',
  '#FF9F5B',
  '#3182F6',
  '#00C2A8',
  '#8B5CF6',
  '#B0B8C1',
];

export default function CategoriesPage() {
  const { currentGroup } = useGroupContext();
  const { categories, mutate } = useCategories();
  const { mutate: globalMutate } = useSWRConfig();
  const [type, setType] = useState<CategoryType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const filtered = categories
    .filter((c) => c.type === type)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filtered.length) return;
    const a = filtered[index];
    const b = filtered[targetIndex];
    setMovingId(a.id);
    try {
      await Promise.all([
        api.put(`/api/categories/${a.id}`, { sort_order: b.sort_order }),
        api.put(`/api/categories/${b.id}`, { sort_order: a.sort_order }),
      ]);
      mutate();
    } finally {
      setMovingId(null);
    }
  };

  const refreshAll = () => {
    mutate();
    globalMutate((key) => isDataKey(key, '/api/transactions'));
    globalMutate((key) => isDataKey(key, '/api/budgets'));
    globalMutate((key) => isDataKey(key, '/api/stats'));
  };

  const handleDelete = async (c: Category) => {
    if (
      !confirm(
        `"${c.name}" 카테고리를 삭제할까요?\n이 카테고리로 기록된 거래는 "미분류"로 남고, 설정된 예산은 함께 삭제돼요.`
      )
    ) {
      return;
    }
    await api.del(`/api/categories/${c.id}`);
    refreshAll();
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-900">카테고리 관리</h1>
      <p className="text-sm text-ink-500">
        {currentGroup ? (
          <>
            지금은 <span className="font-semibold text-ink-700">{currentGroup.name}</span> 그룹의
            카테고리를 관리하고 있어요. 여기서 바꾼 내용은 그룹 멤버 전체에게 똑같이 적용돼요.
          </>
        ) : (
          '지금은 개인 카테고리를 관리하고 있어요. 상단 전환 메뉴에서 그룹으로 바꾸면 그 그룹의 카테고리를 따로 관리할 수 있어요.'
        )}
      </p>

      <div className="flex rounded-2xl bg-surface-alt p-1">
        {(['expense', 'income'] as CategoryType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={clsx(
              'flex-1 rounded-xl py-2.5 text-sm font-semibold transition',
              type === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-300'
            )}
          >
            {t === 'expense' ? '지출' : '수입'}
          </button>
        ))}
      </div>

      <button
        onClick={() => setCreating(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
      >
        <Plus size={16} /> 카테고리 추가
      </button>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <Card className="py-10 text-center text-sm text-ink-300">
            아직 {type === 'expense' ? '지출' : '수입'} 카테고리가 없어요.
          </Card>
        ) : (
          filtered.map((c, index) => (
            <Card key={c.id} className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || movingId === c.id}
                    className="rounded p-0.5 text-ink-300 hover:bg-surface-alt disabled:opacity-20"
                    aria-label="위로"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => handleMove(index, 1)}
                    disabled={index === filtered.length - 1 || movingId === c.id}
                    className="rounded p-0.5 text-ink-300 hover:bg-surface-alt disabled:opacity-20"
                    aria-label="아래로"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.name.slice(0, 1)}
                </span>
                <span className="text-sm font-semibold text-ink-900">{c.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setEditing(c)}
                  className="rounded-full p-2 text-ink-300 hover:bg-surface-alt"
                  aria-label="수정"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="rounded-full p-2 text-ink-300 hover:bg-surface-alt"
                  aria-label="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {creating && (
        <CategoryFormSheet
          type={type}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refreshAll();
          }}
        />
      )}

      {editing && (
        <CategoryFormSheet
          type={editing.type}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}

function CategoryFormSheet({
  type,
  initial,
  onClose,
  onSaved,
}: {
  type: CategoryType;
  initial?: Category;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('카테고리 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await api.put(`/api/categories/${initial.id}`, {
          name: name.trim(),
          color,
          icon: initial.icon,
          sort_order: initial.sort_order,
        });
      } else {
        await api.post('/api/categories', { name: name.trim(), type, color });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">
            {initial ? '카테고리 수정' : `${type === 'expense' ? '지출' : '수입'} 카테고리 추가`}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">이름</label>
          <input
            type="text"
            placeholder="예: 반려동물"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-14 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-ink-500">색상</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                className={clsx(
                  'h-9 w-9 rounded-full ring-offset-2 transition',
                  color === hex && 'ring-2 ring-ink-900'
                )}
                style={{ backgroundColor: hex }}
                aria-label={hex}
              />
            ))}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-expense">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중...' : initial ? '수정하기' : '추가하기'}
        </button>
      </div>
    </div>
  );
}
