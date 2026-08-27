import useSWR from 'swr';
import { api } from './api';
import { useGroupContext } from './group-context';
import type {
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  SummaryStats,
  TrendPoint,
  BreakdownResponse,
} from '@/types';

// 그룹 컨텍스트가 바뀌면 캐시 키도 바뀌어서 자동으로 다시 불러옵니다.
// (실제 어떤 컨텍스트로 요청할지는 lib/api.ts가 X-Group-Id 헤더로 처리)

export function useCategories() {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    ['/api/categories', currentGroupId],
    ([path]) => api.get<Category[]>(path)
  );
  return { categories: data || [], error, isLoading, mutate };
}

export function useTransactions(month: string) {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    [`/api/transactions?month=${month}`, currentGroupId],
    ([path]) => api.get<Transaction[]>(path)
  );
  return { transactions: data || [], error, isLoading, mutate };
}

export function useBudgets(month: string) {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading, mutate } = useSWR<Budget[]>(
    [`/api/budgets?month=${month}`, currentGroupId],
    ([path]) => api.get<Budget[]>(path)
  );
  return { budgets: data || [], error, isLoading, mutate };
}

export function useRecurring() {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading, mutate } = useSWR<RecurringTransaction[]>(
    ['/api/recurring', currentGroupId],
    ([path]) => api.get<RecurringTransaction[]>(path)
  );
  return { recurrings: data || [], error, isLoading, mutate };
}

export function useSummary(month: string) {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading, mutate } = useSWR<SummaryStats>(
    [`/api/stats/summary?month=${month}`, currentGroupId],
    ([path]) => api.get<SummaryStats>(path)
  );
  return { summary: data, error, isLoading, mutate };
}

export function useTrend(months = 6) {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading } = useSWR<TrendPoint[]>(
    [`/api/stats/trend?months=${months}`, currentGroupId],
    ([path]) => api.get<TrendPoint[]>(path)
  );
  return { trend: data || [], error, isLoading };
}

export function useBreakdown(month: string, type: 'income' | 'expense') {
  const { currentGroupId } = useGroupContext();
  const { data, error, isLoading } = useSWR<BreakdownResponse>(
    [`/api/stats/breakdown?month=${month}&type=${type}`, currentGroupId],
    ([path]) => api.get<BreakdownResponse>(path)
  );
  return { breakdown: data, error, isLoading };
}

/** 그룹/개인 컨텍스트가 바뀌었을 때 관련된 모든 데이터를 다시 불러오기 위한 키 판별 헬퍼 */
export function isDataKey(key: unknown, prefix: string): boolean {
  if (Array.isArray(key)) return typeof key[0] === 'string' && key[0].startsWith(prefix);
  return typeof key === 'string' && key.startsWith(prefix);
}
