create extension if not exists pgcrypto;

create type public.app_role as enum ('superadmin', 'company_admin', 'employee');
create type public.company_status as enum ('active', 'paused', 'pending');
create type public.subscription_status as enum ('trial', 'active', 'paused', 'expired');
create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.job_opening_status as enum ('draft', 'published', 'closed');
create type public.application_status as enum (
  'submitted',
  'ats_reviewed',
  'ats_rejected',
  'admin_review',
  'shortlisted',
  'rejected',
  'approved',
  'hired'
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  contact_email text not null,
  ats_threshold integer not null default 60 check (ats_threshold between 0 and 100),
  status public.company_status not null default 'pending',
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  billing_cycle text not null,
  base_price_inr numeric(12,2) not null default 0,
  billing_mode text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  base_price_inr numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.company_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status public.subscription_status not null default 'trial',
  starts_on date not null default current_date,
  ends_on date,
  seats_purchased integer not null default 1,
  price_override_inr numeric(12,2),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'employee',
  company_id uuid references public.companies(id) on delete set null,
  department text,
  profile_completed boolean not null default false,
  face_enrolled boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  client_name text,
  status public.project_status not null default 'planned',
  budget_inr numeric(12,2),
  start_date date,
  due_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_project text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, profile_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  assignee_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text,
  description text,
  min_ats_score integer not null default 60 check (min_ats_score between 0 and 100),
  status public.job_opening_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opening_id uuid references public.job_openings(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  desired_role text not null,
  resume_link text not null,
  cover_letter text,
  ats_score numeric(5,2) not null default 0,
  ats_threshold_at_submission integer not null default 60,
  ats_report jsonb not null default '{}'::jsonb,
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reviewer_name text not null,
  feedback_type text not null,
  rating integer not null check (rating between 1 and 5),
  note text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'superadmin';
$$;

create or replace function public.same_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_company_id() = target_company_id;
$$;

create or replace function public.bootstrap_user_membership(
  user_email text,
  target_role public.app_role,
  target_company_code text default null,
  target_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_company_id uuid;
begin
  select id into target_user_id
  from auth.users
  where email = user_email;

  if target_user_id is null then
    raise exception 'No auth user found for email %', user_email;
  end if;

  if target_company_code is not null then
    select id into target_company_id
    from public.companies
    where code = upper(target_company_code);

    if target_company_id is null then
      raise exception 'No company found for code %', target_company_code;
    end if;
  end if;

  update public.profiles
  set role = target_role,
      company_id = target_company_id,
      full_name = coalesce(target_full_name, full_name),
      profile_completed = case when target_role = 'superadmin' then true else profile_completed end
  where id = target_user_id;
end;
$$;

create or replace view public.superadmin_company_overview
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.code,
  c.ats_threshold,
  c.status,
  (
    select count(*)
    from public.profiles p
    where p.company_id = c.id and p.role = 'employee'
  ) as employee_count,
  (
    select count(*)
    from public.projects p
    where p.company_id = c.id
  ) as project_count,
  (
    select count(*)
    from public.job_applications ja
    where ja.company_id = c.id
  ) as application_count,
  (
    select coalesce(cs.price_override_inr, sp.base_price_inr, 0)
    from public.company_subscriptions cs
    join public.subscription_plans sp on sp.id = cs.plan_id
    where cs.company_id = c.id
    order by cs.created_at desc
    limit 1
  ) as active_subscription_value_inr
from public.companies c;

revoke all on function public.bootstrap_user_membership(text, public.app_role, text, text) from public;

alter table public.companies enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.job_openings enable row level security;
alter table public.job_applications enable row level security;
alter table public.reviews enable row level security;

create policy "superadmins manage companies"
on public.companies
for all
to authenticated
using (public.is_superadmin() or public.same_company(id))
with check (public.is_superadmin());

create policy "authenticated can read plans"
on public.subscription_plans
for select
to authenticated
using (true);

create policy "superadmins manage plans"
on public.subscription_plans
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "authenticated can read pricing rules"
on public.pricing_rules
for select
to authenticated
using (true);

create policy "superadmins manage pricing rules"
on public.pricing_rules
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "superadmins and matching company admins read subscriptions"
on public.company_subscriptions
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "superadmins manage subscriptions"
on public.company_subscriptions
for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create policy "profiles visible to same company or self"
on public.profiles
for select
to authenticated
using (
  public.is_superadmin()
  or id = auth.uid()
  or public.same_company(company_id)
);

create policy "profiles update self"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_superadmin() or public.same_company(company_id))
with check (id = auth.uid() or public.is_superadmin() or public.same_company(company_id));

create policy "projects visible to matching company"
on public.projects
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "company admins manage projects"
on public.projects
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "project members visible to matching company"
on public.project_members
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "company admins manage project members"
on public.project_members
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "tasks visible to assignee or matching company"
on public.tasks
for select
to authenticated
using (
  public.is_superadmin()
  or public.same_company(company_id)
  or assignee_profile_id = auth.uid()
);

create policy "company admins manage tasks"
on public.tasks
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "job openings readable publicly"
on public.job_openings
for select
to anon, authenticated
using (status = 'published' or public.is_superadmin() or public.same_company(company_id));

create policy "company admins manage job openings"
on public.job_openings
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "public can submit applications"
on public.job_applications
for insert
to anon, authenticated
with check (true);

create policy "admins read applications by company"
on public.job_applications
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "admins update applications by company"
on public.job_applications
for update
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "reviews visible to matching company"
on public.reviews
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "superadmins and company admins manage reviews"
on public.reviews
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));
