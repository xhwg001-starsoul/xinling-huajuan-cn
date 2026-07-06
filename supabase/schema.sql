-- 心灵画卷 v0.4 Supabase 初始表结构
-- 请在 Supabase SQL Editor 中执行。本文件不包含任何密钥。

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text,
  usage_scenario text,
  report_signature text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('admin', 'teacher')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  username text,
  teacher_alias text,
  user_role text,
  content_type text not null,
  is_risk_related boolean default false,
  created_at timestamptz default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.usage_records enable row level security;

-- GRANT 是表级权限，RLS 是行级权限，两者都需要。
-- authenticated 由前端 Supabase anon client 登录后使用，仍会受到下面 RLS 策略限制。
-- service_role 仅由后端 API 使用，用于初始化管理员、创建教师账号和管理账号状态。
grant usage on schema public to anon, authenticated, service_role;
grant select on public.organizations to authenticated;
grant select on public.profiles to authenticated;
grant select, insert on public.usage_records to authenticated;
grant update on public.organizations to authenticated;
grant all privileges on public.organizations to service_role;
grant all privileges on public.profiles to service_role;
grant all privileges on public.usage_records to service_role;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.current_profile_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles
  where id = auth.uid() and is_active = true
  limit 1;
$$;

grant execute on function public.current_profile() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.current_profile_org_id() to authenticated, service_role;

drop policy if exists "profiles_read_own_or_admin_same_org" on public.profiles;
drop policy if exists "profiles_read_own" on public.profiles;
drop policy if exists "profiles_admin_read_same_org" on public.profiles;

create policy "profiles_read_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_admin_read_same_org"
on public.profiles for select
using (public.is_admin() and organization_id = public.current_profile_org_id());

drop policy if exists "organizations_read_own" on public.organizations;
create policy "organizations_read_own"
on public.organizations for select
using (id = public.current_profile_org_id());

drop policy if exists "organizations_admin_update_own" on public.organizations;
create policy "organizations_admin_update_own"
on public.organizations for update
using (
  public.is_admin()
  and id = public.current_profile_org_id()
)
with check (
  public.is_admin()
  and id = public.current_profile_org_id()
);

drop policy if exists "usage_insert_own" on public.usage_records;
create policy "usage_insert_own"
on public.usage_records for insert
with check (
  user_id = auth.uid()
  and organization_id = public.current_profile_org_id()
);

drop policy if exists "usage_read_own_or_admin_same_org" on public.usage_records;
create policy "usage_read_own_or_admin_same_org"
on public.usage_records for select
using (
  user_id = auth.uid()
  or (
    public.is_admin()
    and organization_id = public.current_profile_org_id()
  )
);

drop policy if exists "usage_admin_delete_same_org" on public.usage_records;
create policy "usage_admin_delete_same_org"
on public.usage_records for delete
using (
  public.is_admin()
  and organization_id = public.current_profile_org_id()
);
