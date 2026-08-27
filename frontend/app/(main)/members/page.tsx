'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ChevronUp, ChevronDown, UserMinus } from 'lucide-react';
import Card from '@/components/Card';
import { useGroupContext } from '@/lib/group-context';
import { api } from '@/lib/api';
import type { GroupMember } from '@/types';

export default function MembersPage() {
  const { currentGroup } = useGroupContext();

  if (!currentGroup) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-bold text-ink-900">구성원 관리</h1>
        <Card className="py-10 text-center text-sm text-ink-300">
          개인 컨텍스트에는 구성원이 없어요. 상단 전환 메뉴에서 그룹을 먼저 선택해주세요.
        </Card>
        <Link
          href="/groups"
          className="rounded-2xl bg-surface-alt py-3 text-center text-sm font-semibold text-ink-700"
        >
          그룹 관리로 이동
        </Link>
      </div>
    );
  }

  return <MembersList groupId={currentGroup.id} groupName={currentGroup.name} />;
}

function MembersList({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { data: members, mutate } = useSWR<GroupMember[]>(
    `/api/groups/${groupId}/members`,
    api.get
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = [...(members || [])].sort((a, b) => a.sort_order - b.sort_order);

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[targetIndex];
    setBusyId(a.user_id);
    try {
      await Promise.all([
        api.put(`/api/groups/${groupId}/members/${a.user_id}`, { sort_order: b.sort_order }),
        api.put(`/api/groups/${groupId}/members/${b.user_id}`, { sort_order: a.sort_order }),
      ]);
      mutate();
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (m: GroupMember) => {
    if (!confirm(`${m.email}님을 이 그룹에서 내보낼까요?`)) return;
    setBusyId(m.user_id);
    try {
      await api.del(`/api/groups/${groupId}/members/${m.user_id}`);
      mutate();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-900">구성원 관리</h1>
      <p className="text-sm text-ink-500">
        <span className="font-semibold text-ink-700">{groupName}</span> 그룹의 구성원이에요. 그룹
        안에서는 모든 멤버가 동등한 권한을 가지고 있어서, 누구든 순서를 바꾸거나 다른 멤버를
        내보낼 수 있어요.
      </p>

      <div className="flex flex-col gap-3">
        {sorted.map((m, index) => (
          <Card key={m.user_id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <button
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0 || busyId === m.user_id}
                  className="rounded p-0.5 text-ink-300 hover:bg-surface-alt disabled:opacity-20"
                  aria-label="위로"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => handleMove(index, 1)}
                  disabled={index === sorted.length - 1 || busyId === m.user_id}
                  className="rounded p-0.5 text-ink-300 hover:bg-surface-alt disabled:opacity-20"
                  aria-label="아래로"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {m.email} {m.is_me && <span className="text-xs text-ink-300">(나)</span>}
                </p>
                <p className="text-xs text-ink-300">
                  {new Date(m.joined_at).toLocaleDateString('ko-KR')} 가입
                </p>
              </div>
            </div>
            {!m.is_me && (
              <button
                onClick={() => handleRemove(m)}
                disabled={busyId === m.user_id}
                className="flex items-center gap-1 rounded-xl bg-surface-alt px-3 py-2 text-xs font-semibold text-expense disabled:opacity-50"
              >
                <UserMinus size={14} /> 내보내기
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
