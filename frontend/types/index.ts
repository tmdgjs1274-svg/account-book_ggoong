export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  category: Category | null;
  type: CategoryType;
  amount: number;
  memo: string | null;
  occurred_on: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category: Category;
  month: string;
  amount: number;
  spent: number;
  remaining: number;
  usage_rate: number;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string | null;
  category: Category | null;
  type: CategoryType;
  amount: number;
  memo: string | null;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  is_active: boolean;
}

export interface SummaryStats {
  month: string;
  income: number;
  expense: number;
  balance: number;
  prev_expense: number;
  expense_change_rate: number | null;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

export interface BreakdownItem {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percent: number;
}

export interface BreakdownResponse {
  month: string;
  type: CategoryType;
  total: number;
  categories: BreakdownItem[];
}
