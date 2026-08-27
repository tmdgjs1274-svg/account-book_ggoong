-- ============================================================
-- 마이그레이션 005: 그룹 구성원(멤버) 표시 순서 컬럼 추가
-- "구성원 관리" 화면에서 멤버 순서를 바꿀 수 있도록 sort_order를 추가하고,
-- 기존 멤버는 가입한 순서대로 초기값을 채워줍니다.
-- SQL Editor에 전체 붙여넣고 Run.
-- ============================================================

alter table public.group_members add column if not exists sort_order int not null default 0;

update public.group_members gm
set sort_order = sub.rn
from (
  select id, row_number() over (partition by group_id order by joined_at) as rn
  from public.group_members
) sub
where gm.id = sub.id
  and gm.sort_order = 0;
