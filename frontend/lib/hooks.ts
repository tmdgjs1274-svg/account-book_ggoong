import useSWR from 'swr';
import { api } from './api';
import type {
  Category,
  Transaction,
  Budget,
  RecurringTransaction,
  SummaryStats,
  TrendPoint,
  BreakdownResponse,
} from '@/types';

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[]>('/api/categories', api.get);
  return { categories: data || [], error, isLoading, mutate };
}

export function useTransactions(month: string) {
  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    `/api/transactions?month=${month}`,
    api.get
  );
  return { transactions: data || [], error, isLoading, mutate };
}

export function useBudgets(month: string) {
  const { data, error, isLoading, mutate } = useSWR<Budget[]>(
    `/api/budgets?month=${month}`,
    api.get
  );
  return { budgets: data || [], error, isLoading, mutate };
}

export function useRecurring() {
  const { data, error, isLoading, mutate } = useSWR<RecurringTransaction[]>(
    '/api/recurring',
    api.get
  );
  return { recurrings: data || [], error, isLoading, mutate };
}

export function useSummary(month: string) {
  const { data, error, isLoading, mutate } = useSWR<SummaryStats>(
    `/api/stats/summary?month=${month}`,
    api.get
  );
  return { summary: data, error, isLoading, mutate };
}

export function useTrend(months = 6) {
  const { data, error, isLoading } = useSWR<TrendPoint[]>(
    `/api/stats/trend?months=${months}`,
    api.get
  );
  return { trend: data || [], error, isLoading };
}

export function useBreakdown(month: string, type: 'income' | 'expense') {
  const { data, error, isLoading } = useSWR<BreakdownResponse>(
    `/api/stats/breakdown?month=${month}&type=${type}`,
    api.get
  );
  return { breakdown: data, error, isLoading };
}
