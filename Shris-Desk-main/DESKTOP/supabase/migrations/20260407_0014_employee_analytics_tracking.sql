do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'attendance_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.attendance_status as enum ('present', 'late', 'absent', 'leave', 'remote');
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'submission_review_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.submission_review_status as enum (
      'submitted',
      'accepted',
      'needs_changes',
      'rejected'
    );
  end if;
end
$$;

create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null default 'present',
  check_in_at timestamptz,
  check_out_at timestamptz,
  work_minutes integer not null default 0 check (work_minutes >= 0),
  punctuality_score integer not null default 100 check (punctuality_score between 0 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, attendance_date)
);

create table if not exists public.employee_work_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  session_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  productive_minutes integer not null default 0 check (productive_minutes >= 0),
  idle_minutes integer not null default 0 check (idle_minutes >= 0),
  focus_score integer not null default 75 check (focus_score between 0 and 100),
  activity_score integer not null default 75 check (activity_score between 0 and 100),
  source text not null default 'desktop',
  created_at timestamptz not null default timezone('utc', now()),
  check (ended_at >= started_at)
);

alter table public.employee_attendance enable row level security;
alter table public.employee_work_sessions enable row level security;

create index if not exists employee_attendance_company_date_idx
  on public.employee_attendance (company_id, attendance_date desc);

create index if not exists employee_attendance_profile_date_idx
  on public.employee_attendance (profile_id, attendance_date desc);

create index if not exists employee_work_sessions_company_date_idx
  on public.employee_work_sessions (company_id, session_date desc);

create index if not exists employee_work_sessions_profile_date_idx
  on public.employee_work_sessions (profile_id, session_date desc);

create index if not exists task_submissions_task_status_idx
  on public.task_submissions (task_id, status, created_at desc);

alter table public.task_submissions
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists feedback text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'task_submissions'
      and column_name = 'status'
      and udt_name <> 'submission_review_status'
  ) then
    alter table public.task_submissions
      alter column status drop default;

    alter table public.task_submissions
      alter column status type public.submission_review_status
      using (
        case
          when status in ('accepted', 'needs_changes', 'rejected', 'submitted')
            then status::public.submission_review_status
          else 'submitted'::public.submission_review_status
        end
      );

    alter table public.task_submissions
      alter column status set default 'submitted';
  end if;
end
$$;

create policy "attendance readable by self or matching company"
on public.employee_attendance
for select
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or public.same_company(company_id)
);

create policy "attendance writable by self or matching company"
on public.employee_attendance
for all
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or public.same_company(company_id)
)
with check (
  public.is_superadmin()
  or (
    profile_id = auth.uid()
    and public.same_company(company_id)
  )
  or public.same_company(company_id)
);

create policy "work sessions readable by self or matching company"
on public.employee_work_sessions
for select
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or public.same_company(company_id)
);

create policy "work sessions writable by self or matching company"
on public.employee_work_sessions
for all
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or public.same_company(company_id)
)
with check (
  public.is_superadmin()
  or (
    profile_id = auth.uid()
    and public.same_company(company_id)
  )
  or public.same_company(company_id)
);

create policy "task submissions updated by matching company"
on public.task_submissions
for update
to authenticated
using (
  public.is_superadmin()
  or exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.same_company(t.company_id)
  )
)
with check (
  public.is_superadmin()
  or exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.same_company(t.company_id)
  )
);
