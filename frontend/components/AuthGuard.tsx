'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  const router = useRouter();

  // 닉네임이 없으면(첫 로그인 등) 메인 화면들을 보여주기 전에 닉네임 설정부터 유도해요.
  const hasNickname = !!user?.user_metadata?.nickname;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (!hasNickname) {
      router.replace('/onboarding/nickname');
    }
  }, [loading, session, hasNickname, router]);

  if (loading || !session || !hasNickname) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
