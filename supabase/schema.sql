-- ============================================================
-- 가계부 웹앱 - Supabase 스키마
-- Supabase 프로젝트의 SQL Editor에 이 파일 전체를 붙여넣고 실행하세요.
-- ============================================================

-- 확장 (uuid 생성용, Supabase 프로젝트에는 기본 활성화되어 있음)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. categories (카테고리)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null default '#3182F6',
  icon text not null default 'etc',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_user on public.categories(user_id);

-- ------------------------------------------------------------
-- 2. transactions (거래 내역)
-- ------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 0) not null check (amount > 0),
  memo text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, occurred_on desc);
create index if not exists idx_transactions_category on public.transactions(category_id);

-- ------------------------------------------------------------
-- 3. budgets (카테고리별 월 예산)
-- ------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null, -- 항상 해당 월의 1일 (예: 2026-08-01)
  amount numeric(14, 0) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create index if not exists idx_budgets_user_month on public.budgets(user_id, month);

-- ------------------------------------------------------------
-- 4. recurring_transactions (반복 거래)
-- ------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 0) not null check (amount > 0),
  memo text,
  day_of_month int not null check (day_of_month between 1 and 28),
  start_month date not null, -- 해당 월의 1일
  end_month date, -- null이면 무기한
  last_generated_month date, -- 마지막으로 거래를 생성한 월(1일 기준)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_recurring_user on public.recurring_transactions(user_id);

-- ------------------------------------------------------------
-- Row Level Security: 모든 테이블은 본인 데이터만 접근 가능
-- ------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_transactions enable row level security;

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create policy "recurring_select_own" on public.recurring_transactions for select using (auth.uid() = user_id);
create policy "recurring_insert_own" on public.recurring_transactions for insert with check (auth.uid() = user_id);
create policy "recurring_update_own" on public.recurring_transactions for update using (auth.uid() = user_id);
create policy "recurring_delete_own" on public.recurring_transactions for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 신규 가입자에게 기본 카테고리 자동 생성
-- (모든 사용자에게 동일한 기본값을 제공 — 개별 설정 화면 없이 공통 제공)
-- ------------------------------------------------------------
create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, color, icon, sort_order) values
    (new.id, '식비', 'expense', '#FF6B6B', 'food', 1),
    (new.id, '카페/간식', 'expense', '#F5A623', 'cafe', 2),
    (new.id, '교통', 'expense', '#4A90D9', 'transit', 3),
    (new.id, '주거/통신', 'expense', '#7B61FF', 'home', 4),
    (new.id, '쇼핑', 'expense', '#FF8FB1', 'shopping', 5),
    (new.id, '문화/여가', 'expense', '#2FCB8C', 'culture', 6),
    (new.id, '의료/건강', 'expense', '#5BC8F2', 'health', 7),
    (new.id, '교육', 'expense', '#9B7BFF', 'edu', 8),
    (new.id, '경조사/선물', 'expense', '#FF9F5B', 'gift', 9),
    (new.id, '기타지출', 'expense', '#B0B8C1', 'etc', 10),
    (new.id, '급여', 'income', '#3182F6', 'salary', 1),
    (new.id, '용돈', 'income', '#00C2A8', 'allowance', 2),
    (new.id, '부수입', 'income', '#8B5CF6', 'side', 3),
    (new.id, '기타수입', 'income', '#B0B8C1', 'etc', 4);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_categories on auth.users;
create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute procedure public.handle_new_user_categories();
