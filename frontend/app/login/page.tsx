'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PasswordInput from '@/components/PasswordInput';

// 로그인 아이디(이메일) 기억하기 — 계정 설정이 아니라 "이 브라우저(이 기기)"에만 저장됩니다.
// PC와 모바일에서 각각 다른 브라우저를 쓰면 그 브라우저별로 따로 기억돼요.
const SAVED_EMAIL_KEY = 'hh_budget_saved_email';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberId, setRememberId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberId(true);
      }
    } catch {
      // 프라이빗 모드 등으로 저장소 접근이 안 되면 조용히 무시합니다.
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.');
      return;
    }

    try {
      if (rememberId) {
        localStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
    } catch {
      // 저장소 접근이 안 되어도 로그인 자체는 정상 진행합니다.
    }

    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">뱅크로그</h1>
        <p className="mb-10 text-sm text-ink-500">우리 가족 가계부, 편하게 기록해요</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <PasswordInput
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-sm text-ink-500">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(e) => setRememberId(e.target.checked)}
                className="h-4 w-4 rounded border-surface-border accent-primary"
              />
              아이디 저장 (이 기기에서)
            </label>
            <Link href="/reset-password" className="text-sm font-medium text-ink-300">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-14 rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold text-primary">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
