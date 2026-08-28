'use client';

import { useState, FormEvent } from 'react';
import Card from '@/components/Card';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabaseClient';

// "설정 > 내 정보" 탭의 실제 내용물입니다. 닉네임 변경과 비밀번호 변경을 다뤄요.
export default function ProfileManager() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-1">
        <p className="text-xs text-ink-300">이메일</p>
        <p className="text-sm font-semibold text-ink-900">{user?.email}</p>
      </Card>

      <NicknameSection />
      <PasswordSection />
    </div>
  );
}

function NicknameSection() {
  const { user } = useAuth();
  const [nickname, setNickname] = useState(user?.user_metadata?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    if (trimmed.length > 12) {
      setError('닉네임은 12자 이내로 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ data: { nickname: trimmed } });
    setSaving(false);

    if (updateError) {
      setError('저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    setSavedAt(Date.now());
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-900">닉네임</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setSavedAt(null);
          }}
          placeholder="예: 승헌"
          className="h-12 rounded-2xl border border-surface-border bg-white px-4 text-sm outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-expense">{error}</p>}
        {savedAt && !error && <p className="text-sm text-primary">저장됐어요.</p>}
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '저장 중...' : '닉네임 저장'}
        </button>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedAt(null);

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError('비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    setPassword('');
    setConfirm('');
    setSavedAt(Date.now());
  };

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-900">비밀번호 변경</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호 (6자 이상)"
          className="h-12 rounded-2xl border border-surface-border bg-white px-4 text-sm outline-none focus:border-primary"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="새 비밀번호 확인"
          className="h-12 rounded-2xl border border-surface-border bg-white px-4 text-sm outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-expense">{error}</p>}
        {savedAt && !error && <p className="text-sm text-primary">비밀번호가 변경됐어요.</p>}
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </Card>
  );
}
