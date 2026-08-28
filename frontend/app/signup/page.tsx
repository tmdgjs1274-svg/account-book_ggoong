'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import PasswordInput from '@/components/PasswordInput';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? '이미 가입된 이메일이에요.'
          : '회원가입에 실패했어요. 잠시 후 다시 시도해주세요.'
      );
      return;
    }

    // Supabase 프로젝트의 이메일 확인 설정이 꺼져 있으면 세션이 바로 생성됩니다.
    if (data.session) {
      router.replace('/dashboard');
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">가입 확인 메일을 보냈어요</h1>
        <p className="mb-8 text-sm text-ink-500">
          메일함에서 인증 링크를 확인한 뒤 로그인해주세요.
        </p>
        <Link
          href="/login"
          className="h-14 rounded-2xl bg-primary px-8 py-4 text-base font-semibold text-white"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">회원가입</h1>
        <p className="mb-10 text-sm text-ink-500">30초면 시작할 수 있어요</p>

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
            placeholder="비밀번호 (6자 이상)"
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
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-primary">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
