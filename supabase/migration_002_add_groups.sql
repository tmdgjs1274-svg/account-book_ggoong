-- ============================================================
-- 마이그레이션 002: 그룹(가족 공유 가계부) 기능 추가
-- 이미 schema.sql을 실행한 기존 프로젝트에 추가로 실행하세요.
-- SQL Editor에 전체 붙여넣고 Run.
-- ============================================================

-- 1. groups (그룹)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. group_members (그룹 멤버십)
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);

-- 3. 기존 테이블에 group_id 컬럼 추가 (null이면 개인 데이터, 값이 있으면 그룹 데이터)
alter table public.categories add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.transactions add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.budgets add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.recurring_transactions add column if not exists group_id uuid references public.groups(id) on delete cascade;

create index if not exists idx_categories_group on public.categories(group_id);
create index if not exists idx_transactions_group on public.transactions(group_id);
create index if not exists idx_budgets_group on public.budgets(group_id);
create index if not exists idx_recurring_group on public.recurring_transactions(group_id);

-- 4. budgets의 기존 unique 제약(개인 전용)을 그룹도 지원하도록 교체
--    - 개인 예산: (user_id, category_id, month) 조합으로 유일
--    - 그룹 예산: (group_id, category_id, month) 조합으로 유일 (그룹 전체가 공유하는 하나의 예산)
alter table public.budgets drop constraint if exists budgets_user_id_category_id_month_key;

drop index if exists uniq_budgets_personal;
drop index if exists uniq_budgets_group;
create unique index uniq_budgets_personal on public.budgets(user_id, category_id, month) where group_id is null;
create unique index uniq_budgets_group on public.budgets(group_id, category_id, month) where group_id is not null;

-- 5. RLS 활성화 (groups, group_members)
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups for select using (
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
);

drop policy if exists "groups_insert_self" on public.groups;
create policy "groups_insert_self" on public.groups for insert with check (auth.uid() = created_by);

drop policy if exists "groups_update_member" on public.groups;
create policy "groups_update_member" on public.groups for update using (
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
);

drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self" on public.group_members for insert with check (auth.uid() = user_id);

drop policy if exists "group_members_delete_self" on public.group_members;
create policy "group_members_delete_self" on public.group_members for delete using (auth.uid() = user_id);

-- 6. 기존 테이블 RLS 정책을 "개인 소유 OR 그룹 멤버" 조건으로 교체
drop policy if exists "categories_select_own" on public.categories;
drop policy if exists "categories_insert_own" on public.categories;
drop policy if exists "categories_update_own" on public.categories;
drop policy if exists "categories_delete_own" on public.categories;

create policy "categories_select_scope" on public.categories for select using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = categories.group_id and gm.user_id = auth.uid()))
);
create policy "categories_insert_scope" on public.categories for insert with check (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = categories.group_id and gm.user_id = auth.uid()))
);
create policy "categories_update_scope" on public.categories for update using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = categories.group_id and gm.user_id = auth.uid()))
);
create policy "categories_delete_scope" on public.categories for delete using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = categories.group_id and gm.user_id = auth.uid()))
);

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_scope" on public.transactions for select using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = transactions.group_id and gm.user_id = auth.uid()))
);
create policy "transactions_insert_scope" on public.transactions for insert with check (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = transactions.group_id and gm.user_id = auth.uid()))
);
create policy "transactions_update_scope" on public.transactions for update using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = transactions.group_id and gm.user_id = auth.uid()))
);
create policy "transactions_delete_scope" on public.transactions for delete using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = transactions.group_id and gm.user_id = auth.uid()))
);

drop policy if exists "budgets_select_own" on public.budgets;
drop policy if exists "budgets_insert_own" on public.budgets;
drop policy if exists "budgets_update_own" on public.budgets;
drop policy if exists "budgets_delete_own" on public.budgets;

create policy "budgets_select_scope" on public.budgets for select using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = budgets.group_id and gm.user_id = auth.uid()))
);
create policy "budgets_insert_scope" on public.budgets for insert with check (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = budgets.group_id and gm.user_id = auth.uid()))
);
create policy "budgets_update_scope" on public.budgets for update using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = budgets.group_id and gm.user_id = auth.uid()))
);
create policy "budgets_delete_scope" on public.budgets for delete using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = budgets.group_id and gm.user_id = auth.uid()))
);

drop policy if exists "recurring_select_own" on public.recurring_transactions;
drop policy if exists "recurring_insert_own" on public.recurring_transactions;
drop policy if exists "recurring_update_own" on public.recurring_transactions;
drop policy if exists "recurring_delete_own" on public.recurring_transactions;

create policy "recurring_select_scope" on public.recurring_transactions for select using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = recurring_transactions.group_id and gm.user_id = auth.uid()))
);
create policy "recurring_insert_scope" on public.recurring_transactions for insert with check (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = recurring_transactions.group_id and gm.user_id = auth.uid()))
);
create policy "recurring_update_scope" on public.recurring_transactions for update using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = recurring_transactions.group_id and gm.user_id = auth.uid()))
);
create policy "recurring_delete_scope" on public.recurring_transactions for delete using (
  (group_id is null and auth.uid() = user_id)
  or (group_id is not null and exists (select 1 from public.group_members gm where gm.group_id = recurring_transactions.group_id and gm.user_id = auth.uid()))
);
