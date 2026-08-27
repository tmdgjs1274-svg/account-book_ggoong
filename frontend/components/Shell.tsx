'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Home, List, PiggyBank, BarChart3, Repeat, Plus, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import TransactionFormSheet from './TransactionFormSheet';
import GroupSwitcher from './GroupSwitcher';

const NAV_ITEMS = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/transactions', label: '내역', icon: List },
  { href: '/budgets', label: '예산', icon: PiggyBank },
  { href: '/stats', label: '통계', icon: BarChart3 },
  { href: '/recurring', label: '반복', icon: Repeat },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* 데스크톱 사이드바 */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-surface-border bg-white px-4 py-6 md:flex">
        <div className="mb-4 px-2 text-xl font-extrabold text-ink-900">뱅크로그</div>
        <div className="mb-6">
          <GroupSwitcher />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition',
                  active ? 'bg-primary-50 text-primary' : 'text-ink-500 hover:bg-surface-alt'
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setQuickAddOpen(true)}
          className="mb-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white"
        >
          <Plus size={18} /> 거래 추가
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-300 hover:bg-surface-alt"
        >
          <LogOut size={18} /> 로그아웃
        </button>
      </aside>

      {/* 모바일 상단 그룹 스위처 */}
      <div className="sticky top-0 z-20 border-b border-surface-border bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-xs">
          <GroupSwitcher />
        </div>
      </div>

      {/* 본문 */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:ml-60 md:max-w-none md:px-10 md:pb-10">
        {children}
      </main>

      {/* 모바일 하단 탭바 */}
      {/* 좌/우를 각각 flex-1 컨테이너로 감싸서 항목 개수가 안 맞아도(2개 vs 3개)
          가운데 + 버튼이 항상 정중앙에 오도록 고정합니다. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-surface-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={!!pathname?.startsWith(item.href)} />
          ))}
        </div>

        <button
          onClick={() => setQuickAddOpen(true)}
          className="-mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg"
          aria-label="거래 추가"
        >
          <Plus size={26} />
        </button>

        <div className="flex flex-1 items-center justify-around">
          {NAV_ITEMS.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={!!pathname?.startsWith(item.href)} />
          ))}
        </div>
      </nav>

      <TransactionFormSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={() => setQuickAddOpen(false)}
      />
    </div>
  );
}

function TabLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium',
        active ? 'text-primary' : 'text-ink-300'
      )}
    >
      <Icon size={22} />
      {item.label}
    </Link>
  );
}
