'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? '/dashboard' : '/login');
  }, [loading, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}
