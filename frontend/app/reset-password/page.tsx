'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Status = 'checking' | 'ready' | 'invalid';

// Supabase가 보내는 "비밀번호 재설정" 메일의 링크가 도착하는 페이지예요.
// 링크를 클릭하면 supabase-js가 URL에 담긴 토큰을 자동으로 읽어서 임시 세션을 만들고
// 'PASSWORD_RECOVERY' 이벤트를 보내주는데, 그걸 받은 다음에야 새 비밀번호를 설정할 수 있어요.
export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready');
    });

    // 이미 이 탭에서 세션이 잡혀있는 경우(새로고침 등)도 한 번 더 확인해요.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus('ready');
    });

    // 링크가 없거나 만료된 경우, 이벤트가 영영 안 올 수 있어서 잠시 기다렸다가 안내 문구로 전환해요.
    const timer = setTimeout(() => {
      setStatus((s) => (s === 'checking' ? 'invalid' : s));
    }, 2500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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
      setError('비밀번호를 변경하지 못했어요. 링크가 만료되었을 수 있어요.');
      return;
    }

    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.replace('/login'), 1500);
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">비밀번호가 변경됐어요</h1>
        <p className="text-sm text-ink-500">잠시 후 로그인 화면으로 이동할게요.</p>
      </div>
    );
  }

  if (status !== 'ready') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        {status === 'checking' ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-ink-900">유효하지 않은 링크예요</h1>
            <p className="mb-8 text-sm text-ink-500">
              링크가 만료되었거나 잘못됐어요. 메일함에서 재설정 메일을 다시 요청해주세요.
            </p>
            <Link
              href="/login"
              className="h-14 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white"
            >
              로그인으로 돌아가기
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">비밀번호 재설정</h1>
        <p className="mb-10 text-sm text-ink-500">새로 사용할 비밀번호를 입력해주세요</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            required
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-white px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          {error && <p className="text-sm text-expense">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-3 h-14 rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}
