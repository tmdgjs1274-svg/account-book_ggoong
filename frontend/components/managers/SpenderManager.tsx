'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import { SortableList } from '@/components/SortableList';
import { useSpenders, isDataKey } from '@/lib/hooks';
import { useGroupContext } from '@/lib/group-context';
import { api } from '@/lib/api';
import { useSWRConfig } from 'swr';
import type { Spender } from '@/types';

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

// 구성원(소비자 이름표) 관리 화면의 실제 내용물입니다. /members 페이지와, "가계부 설정" 안의
// 구성원 관리 탭 양쪽에서 이 컴포넌트를 그대로 재사용해요.
export default function SpenderManager() {
  const { currentGroup } = useGroupContext();
  const { spenders, mutate } = useSpenders();
  const { mutate: globalMutate } = useSWRConfig();
  const [editing, setEditing] = useState<Spender | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = [...spenders].sort((a, b) => a.sort_order - b.sort_order);

  const refreshAll = () => {
    mutate();
    globalMutate((key) => isDataKey(key, '/api/transactions'));
  };

  const handleReorder = async (reordered: Spender[]) => {
    const updated = reordered.map((s, i) => ({ ...s, sort_order: i }));
    mutate(updated, false); // 낙관적 업데이트
    await Promise.all(
      updated.map((s) =>
        api.put(`/api/spenders/${s.id}`, { name: s.name, color: s.color, sort_order: s.sort_order })
      )
    );
    mutate();
  };

  const handleDelete = async (s: Spender) => {
    if (
      !confirm(`"${s.name}" 구성원을 삭제할까요?\n이 구성원으로 표시된 거래는 "미지정"으로 남아요.`)
    ) {
      return;
    }
    await api.del(`/api/spenders/${s.id}`);
    refreshAll();
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-500">
        거래를 <span className="font-semibold text-ink-700">누가 소비했는지</span> 표시하기 위한
        이름표예요. 로그인 계정과는 별개라서, 계정이 없는 가족도 등록해두고 아무 계정에서나 그
        구성원을 골라 거래를 기록할 수 있어요.{' '}
        {currentGroup ? (
          <>
            지금은 <span className="font-semibold text-ink-700">{currentGroup.name}</span> 그룹의
            구성원 목록이에요.
          </>
        ) : (
          '지금은 개인 구성원 목록이에요.'
        )}
      </p>

      <button
        onClick={() => setCreating(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
      >
        <Plus size={16} /> 구성원 추가
      </button>

      {sorted.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-300">
          아직 등록된 구성원이 없어요. 예: 아빠, 엄마, 첫째
        </Card>
      ) : (
        <SortableList
          items={sorted}
          onReorder={handleReorder}
          renderItem={(s, dragHandle) => (
            <Card className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-3">
                {dragHandle}
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: s.color }}
                >
                  {s.name.slice(0, 1)}
                </span>
                <span className="text-sm font-semibold text-ink-900">{s.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setEditing(s)}
                  className="rounded-full p-2 text-ink-300 hover:bg-surface-alt"
                  aria-label="수정"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="rounded-full p-2 text-ink-300 hover:bg-surface-alt"
                  aria-label="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          )}
        />
      )}

      {creating && (
        <SpenderFormSheet
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refreshAll();
          }}
        />
      )}

      {editing && (
        <SpenderFormSheet
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

function SpenderFormSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Spender;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await api.put(`/api/spenders/${initial.id}`, {
          name: name.trim(),
          color,
          sort_order: initial.sort_order,
        });
      } else {
        await api.post('/api/spenders', { name: name.trim(), color });
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
            {initial ? '구성원 수정' : '구성원 추가'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-ink-300 hover:bg-surface-alt">
            <X size={22} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-ink-500">이름</label>
          <input
            type="text"
            placeholder="예: 아빠"
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
