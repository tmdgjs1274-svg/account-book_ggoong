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

// 로그인 계정과 무관하게, "이 거래를 누가 소비했는지" 표시하기 위한 이름표.
// 실제로 로그인해서 기록한 사람(user_id)과는 다른 개념이라, 계정이 없는
// 가족 구성원도 등록해두고 아무 계정에서나 골라 쓸 수 있어요.
export interface Spender {
  id: string;
  user_id: string;
  group_id: string | null;
  name: string;
  color: string;
  sort_order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  category: Category | null;
  spender_id: string | null;
  spender: Spender | null;
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

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface GroupMember {
  user_id: string;
  email: string;
  joined_at: string;
  is_me: boolean;
}
