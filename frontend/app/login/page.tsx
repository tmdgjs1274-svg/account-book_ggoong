'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">머니로그</h1>
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
          <input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />

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
