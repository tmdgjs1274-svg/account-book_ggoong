'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Copy, LogOut, Plus, UserPlus, ChevronDown, ChevronUp, Check } from 'lucide-react';
import Card from '@/components/Card';
import BackButton from '@/components/BackButton';
import { useGroupContext } from '@/lib/group-context';
import { api } from '@/lib/api';
import type { GroupMember } from '@/types';

export default function GroupsPage() {
  const { groups, currentGroupId, setGroup, refreshGroups } = useGroupContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-xl font-bold text-ink-900">그룹 관리</h1>
      </div>
      <p className="text-sm text-ink-500">
        가족이나 함께 살림을 관리하는 사람들과 그룹을 만들어 같은 가계부를 공유할 수 있어요.
        초대 코드를 공유하면 누구나 참여할 수 있고, 그룹 안에서는 모든 멤버가 동등하게 거래를
        기록하고 수정할 수 있어요.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
        >
          <Plus size={16} /> 그룹 만들기
        </button>
        <button
          onClick={() => setJoinOpen(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-alt py-3 text-sm font-semibold text-ink-700"
        >
          <UserPlus size={16} /> 초대 코드로 참여
        </button>
      </div>

      {groups.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-300">
          아직 속한 그룹이 없어요. 그룹을 만들거나 초대 코드로 참여해보세요.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <Card key={g.id} className="!p-0">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-ink-900">{g.name}</p>
                  <p className="text-xs text-ink-300">
                    멤버 {g.member_count}명
                    {currentGroupId === g.id && (
                      <span className="ml-1.5 font-semibold text-primary">· 현재 보는 중</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentGroupId !== g.id && (
                    <button
                      onClick={() => setGroup(g.id)}
                      className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary"
                    >
                      전환
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                    className="rounded-full p-1.5 text-ink-300 hover:bg-surface-alt"
                  >
                    {expandedId === g.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {expandedId === g.id && (
                <GroupDetail groupId={g.id} inviteCode={g.invite_code} onLeft={refreshGroups} />
              )}
            </Card>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateGroupSheet
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            refreshGroups();
            setGroup(id);
          }}
        />
      )}

      {joinOpen && (
        <JoinGroupSheet
          onClose={() => setJoinOpen(false)}
          onJoined={(id) => {
            setJoinOpen(false);
            refreshGroups();
            setGroup(id);
          }}
        />
      )}
    </div>
  );
}

function GroupDetail({
  groupId,
  inviteCode,
  onLeft,
}: {
  groupId: string;
  inviteCode: string;
  onLeft: () => void;
}) {
  const { setGroup, currentGroupId } = useGroupContext();
  const { data: members } = useSWR<GroupMember[]>(`/api/groups/${groupId}/members`, api.get);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시 (사용자가 직접 코드 확인 가능)
    }
  };

  const handleLeave = async () => {
    if (!confirm('이 그룹에서 나갈까요? 그룹 데이터는 다른 멤버에게 그대로 남아요.')) return;
    await api.post(`/api/groups/${groupId}/leave`);
    if (currentGroupId === groupId) setGroup(null);
    onLeft();
  };

  return (
    <div className="border-t border-surface-border px-5 py-4">
      <p className="mb-1.5 text-xs font-medium text-ink-500">초대 코드</p>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex-1 rounded-xl bg-surface-alt px-4 py-2.5 text-center font-mono text-base font-bold tracking-widest text-ink-900">
          {inviteCode}
        </span>
        <button
          onClick={handleCopy}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt text-ink-500"
        >
          {copied ? <Check size={18} className="text-income" /> : <Copy size={18} />}
        </button>
      </div>

      <p className="mb-1.5 text-xs font-medium text-ink-500">멤버 ({members?.length ?? 0}명)</p>
      <ul className="mb-4 flex flex-col gap-1.5">
        {(members || []).map((m) => (
          <li key={m.user_id} className="flex items-center justify-between text-sm">
            <span className="text-ink-700">
              {m.nickname || '닉네임 없음'} {m.is_me && <span className="text-xs text-ink-300">(나)</span>}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleLeave}
        className="flex items-center gap-1.5 text-sm font-medium text-expense"
      >
        <LogOut size={15} /> 그룹 나가기
      </button>
    </div>
  );
}

function CreateGroupSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const group = await api.post<{ id: string }>('/api/groups', { name: name.trim() });
      onCreated(group.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '그룹을 만들지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <h2 className="mb-4 text-lg font-bold text-ink-900">새 그룹 만들기</h2>
        <input
          type="text"
          placeholder="예: 우리 가족"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 h-14 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary"
        />
        {error && <p className="mb-3 text-sm text-expense">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-surface-alt text-base font-semibold text-ink-700"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-14 flex-1 rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-50"
          >
            {saving ? '만드는 중...' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinGroupSheet({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (id: string) => void;
}) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const group = await api.post<{ id: string }>('/api/groups/join', {
        invite_code: code.trim(),
      });
      onJoined(group.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '참여하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-sheet md:rounded-3xl">
        <h2 className="mb-4 text-lg font-bold text-ink-900">초대 코드로 참여</h2>
        <input
          type="text"
          placeholder="8자리 코드 입력"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="mb-4 h-14 w-full rounded-2xl border border-surface-border bg-surface-alt px-4 text-center font-mono text-lg font-bold tracking-widest outline-none focus:border-primary"
          maxLength={8}
        />
        {error && <p className="mb-3 text-sm text-expense">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-surface-alt text-base font-semibold text-ink-700"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-14 flex-1 rounded-2xl bg-primary text-base font-semibold text-white disabled:opacity-50"
          >
            {saving ? '참여 중...' : '참여하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
