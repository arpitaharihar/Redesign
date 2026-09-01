create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  submission_url text not null,
  notes text,
  status text not null default 'submitted',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.task_submissions enable row level security;

create policy "task submissions readable by assignee or company"
on public.task_submissions
for select
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.same_company(t.company_id)
  )
);

create policy "task submissions insert by assignee"
on public.task_submissions
for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.assignee_profile_id = auth.uid()
  )
);
