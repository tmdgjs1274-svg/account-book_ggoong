'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Step = 'request' | 'verify' | 'done';

// 비밀번호를 잊었을 때, 이메일로 받은 인증코드를 입력해서 새 비밀번호를 설정하는 화면이에요.
//
// (기존엔 "링크 클릭" 방식이었는데, 일부 메일 서비스(네이버 메일 등)가 메일 안의 링크를
// 보안 검사 목적으로 자동으로 미리 방문해버려서, 정작 사용자가 클릭했을 땐 이미 링크가
// 소진되어 "만료된 링크" 에러가 나는 문제가 있었어요. 코드를 직접 입력하는 방식은 이런
// 자동 스캔의 영향을 받지 않아서 안전해요.)
export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error: reqError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (reqError) {
      setError('인증코드 발송에 실패했어요. 이메일을 확인해주세요.');
      return;
    }
    setInfo('인증코드를 보냈어요. 메일함을 확인해주세요.');
    setStep('verify');
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error: reqError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (reqError) {
      setError('인증코드 재발송에 실패했어요.');
      return;
    }
    setInfo('인증코드를 다시 보냈어요.');
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('인증코드를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.');
      return;
    }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });

    if (verifyError) {
      setLoading(false);
      setError('인증코드가 올바르지 않거나 만료됐어요. 코드를 다시 받아주세요.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('비밀번호를 변경하지 못했어요. 다시 시도해주세요.');
      return;
    }

    setStep('done');
    await supabase.auth.signOut();
    setTimeout(() => router.replace('/login'), 1500);
  };

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">비밀번호가 변경됐어요</h1>
        <p className="text-sm text-ink-500">잠시 후 로그인 화면으로 이동할게요.</p>
      </div>
    );
  }

  if (step === 'request') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-2xl font-bold text-ink-900">비밀번호 재설정</h1>
          <p className="mb-10 text-sm text-ink-500">
            가입하신 이메일을 입력하시면 인증코드를 보내드려요
          </p>

          <form onSubmit={handleRequestCode} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />

            {error && <p className="text-sm text-expense">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-3 h-14 rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '발송 중...' : '인증코드 받기'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            <Link href="/login" className="font-semibold text-primary">
              로그인으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">인증코드 확인</h1>
        <p className="mb-10 text-sm text-ink-500">
          {email}로 보낸 인증코드와 새 비밀번호를 입력해주세요
        </p>

        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="인증코드"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            maxLength={12}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-center text-lg font-bold tracking-[0.3em] outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            required
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="password"
            required
            placeholder="새 비밀번호 확인"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-14 rounded-2xl border border-surface-border bg-surface-alt px-4 text-base outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
          />

          {info && <p className="text-sm text-income">{info}</p>}
          {error && <p className="text-sm text-expense">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-14 rounded-2xl bg-primary text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button onClick={handleResend} disabled={loading} className="font-semibold text-primary">
            코드 다시 받기
          </button>
          <span className="text-ink-300">·</span>
          <button
            onClick={() => {
              setStep('request');
              setCode('');
              setPassword('');
              setConfirm('');
              setError(null);
              setInfo(null);
            }}
            className="font-medium text-ink-500"
          >
            이메일 다시 입력
          </button>
        </div>
      </div>
    </div>
  );
}
