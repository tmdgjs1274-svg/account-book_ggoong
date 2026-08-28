'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabaseClient';

// 첫 로그인(또는 닉네임을 아직 설정하지 않은 계정)에 보여주는 온보딩 화면이에요.
// AuthGuard가 닉네임이 없는 계정을 여기로 보내줘요.
export default function NicknameOnboardingPage() {
  const { session, user, loading } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (user?.user_metadata?.nickname) {
      router.replace('/dashboard');
    }
  }, [loading, session, user, router]);

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
    router.replace('/dashboard');
  };

  if (loading || !session || user?.user_metadata?.nickname) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">닉네임을 알려주세요</h1>
        <p className="mb-10 text-sm text-ink-500">
          가계부 안에서 나를 나타낼 이름이에요. 나중에 설정에서 바꿀 수 있어요.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            required
            autoFocus
            placeholder="예: 승헌"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {error && <p className="text-sm text-expense">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-3 h-14 rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
