'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tags, Users, Repeat, User, LogOut } from 'lucide-react';
import clsx from 'clsx';
import Card from '@/components/Card';
import Switch from '@/components/Switch';
import CategoryManager from '@/components/managers/CategoryManager';
import SpenderManager from '@/components/managers/SpenderManager';
import RecurringManager from '@/components/managers/RecurringManager';
import ProfileManager from '@/components/managers/ProfileManager';
import { useLedgerSettings } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type SettingsTab = 'profile' | 'categories' | 'spenders' | 'recurring';

const TABS: { value: SettingsTab; label: string; icon: typeof Tags }[] = [
  { value: 'profile', label: '내 정보', icon: User },
  { value: 'categories', label: '카테고리', icon: Tags },
  { value: 'spenders', label: '구성원', icon: Users },
  { value: 'recurring', label: '반복', icon: Repeat },
];

export default function BudgetsSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (!confirm('로그아웃할까요?')) return;
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-ink-900">설정</h1>

      <LedgerTypeSettings />

      <div className="flex rounded-2xl bg-surface-alt p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={clsx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition sm:text-sm',
                tab === t.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-300'
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && <ProfileManager />}
      {tab === 'categories' && <CategoryManager />}
      {tab === 'spenders' && <SpenderManager />}
      {tab === 'recurring' && <RecurringManager />}

      {/* 모바일 하단 탭바에는 로그아웃 메뉴가 따로 없어서, 설정 화면인 여기에 넣어뒀어요.
          데스크톱은 사이드바에 이미 로그아웃 버튼이 있어서 여기서는 숨겨요. */}
      <button
        onClick={handleSignOut}
        className="flex items-center justify-center gap-1.5 rounded-2xl border border-surface-border py-3 text-sm font-semibold text-ink-500 md:hidden"
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  );
}

// 그룹(또는 개인) 전체가 공통으로 적용받는 수입/지출 사용 여부 설정.
// 둘 중 하나는 항상 켜져 있어야 하고, 여기서 끈 유형은 카테고리/거래입력/통계 등
// 앱 전체 화면에서 숨겨져요.
function LedgerTypeSettings() {
  const { settings, mutate } = useLedgerSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (key: 'income_enabled' | 'expense_enabled', next: boolean) => {
    const draft = { ...settings, [key]: next };
    if (!draft.income_enabled && !draft.expense_enabled) {
      setError('수입과 지출 중 최소 하나는 사용해야 해요.');
      return;
    }
    setError(null);
    setSaving(true);
    mutate(draft, false); // 낙관적 업데이트
    try {
      await api.put('/api/ledger-settings', draft);
      mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요.');
      mutate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-ink-900">수입/지출 사용 설정</p>
      <p className="-mt-2 text-xs text-ink-300">
        여기서 끄면 앱 전체(카테고리, 거래 입력, 통계 등)에서 해당 유형이 보이지 않아요.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">수입 사용</span>
        <Switch
          checked={settings.income_enabled}
          disabled={saving}
          onChange={(next) => handleToggle('income_enabled', next)}
          label="수입 사용"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">지출 사용</span>
        <Switch
          checked={settings.expense_enabled}
          disabled={saving}
          onChange={(next) => handleToggle('expense_enabled', next)}
          label="지출 사용"
        />
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
    </Card>
  );
}

/*
 * 예산 관리 기능은 당분간 쓰지 않을 것 같아 화면에서 뺐어요 (기능 자체를 지운 게 아니라
 * 주석 처리만 해둔 상태 — 나중에 다시 켜고 싶으면 이 블록과 백엔드 /api/budgets 라우트를
 * 그대로 살리면 됩니다).
 *
 * import { useState } from 'react';
 * import { X } from 'lucide-react';
 * import Card from '@/components/Card';
 * import ProgressBar from '@/components/ProgressBar';
 * import MonthSwitcher from '@/components/MonthSwitcher';
 * import { useBudgets, useCategories } from '@/lib/hooks';
 * import { api } from '@/lib/api';
 * import { formatWon, currentMonthStr } from '@/lib/format';
 * import type { Category } from '@/types';
 *
 * function BudgetsLegacySection() {
 *   const [month, setMonth] = useState(currentMonthStr());
 *   const { budgets, mutate } = useBudgets(month);
 *   const { categories } = useCategories();
 *   const [editingCategory, setEditingCategory] = useState<Category | null>(null);
 *
 *   const expenseCategories = categories.filter((c) => c.type === 'expense');
 *   const budgetByCategory = new Map(budgets.map((b) => [b.category_id, b]));
 *
 *   const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
 *   const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
 *
 *   return (
 *     <div className="flex flex-col gap-5">
 *       <div className="flex items-center justify-between">
 *         <h1 className="text-xl font-bold text-ink-900">예산</h1>
 *         <MonthSwitcher month={month} onChange={setMonth} />
 *       </div>
 *
 *       <Card>
 *         <p className="text-xs text-ink-300">이번 달 전체 예산 사용률</p>
 *         <p className="mt-1 text-2xl font-extrabold text-ink-900">
 *           {formatWon(totalSpent)}{' '}
 *           <span className="text-sm font-medium text-ink-300">/ {formatWon(totalBudget)}</span>
 *         </p>
 *         <div className="mt-3">
 *           <ProgressBar rate={totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0} />
 *         </div>
 *       </Card>
 *
 *       <div className="flex flex-col gap-3">
 *         {expenseCategories.map((c) => {
 *           const budget = budgetByCategory.get(c.id);
 *           return (
 *             <Card key={c.id} className="flex items-center justify-between gap-4">
 *               <div className="flex flex-1 items-center gap-3">
 *                 <span
 *                   className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
 *                   style={{ backgroundColor: c.color }}
 *                 >
 *                   {c.name.slice(0, 1)}
 *                 </span>
 *                 <div className="flex-1">
 *                   <div className="flex items-center justify-between">
 *                     <span className="text-sm font-semibold text-ink-900">{c.name}</span>
 *                     {budget && (
 *                       <span className="text-xs text-ink-500">
 *                         {formatWon(budget.spent)} / {formatWon(budget.amount)}
 *                       </span>
 *                     )}
 *                   </div>
 *                   {budget ? (
 *                     <div className="mt-2">
 *                       <ProgressBar rate={budget.usage_rate} color={c.color} />
 *                     </div>
 *                   ) : (
 *                     <p className="mt-1 text-xs text-ink-300">예산이 설정되지 않았어요</p>
 *                   )}
 *                 </div>
 *               </div>
 *               <button
 *                 onClick={() => setEditingCategory(c)}
 *                 className="shrink-0 rounded-xl bg-surface-alt px-3 py-2 text-xs font-semibold text-ink-500"
 *               >
 *                 {budget ? '수정' : '설정'}
 *               </button>
 *             </Card>
 *           );
 *         })}
 *       </div>
 *     </div>
 *   );
 * }
 */
