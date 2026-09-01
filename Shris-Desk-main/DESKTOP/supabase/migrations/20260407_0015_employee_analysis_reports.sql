create table if not exists public.employee_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid references public.job_applications(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete cascade,
  report_stage text not null default 'ats_screening',
  recommendation_level text not null default 'observe',
  subject_name text not null,
  subject_email text not null,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  summary text not null,
  admin_recommendation text not null,
  strengths jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  source_metrics jsonb not null default '{}'::jsonb,
  last_generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists employee_analysis_reports_application_id_idx
  on public.employee_analysis_reports (application_id)
  where application_id is not null;

create unique index if not exists employee_analysis_reports_profile_id_idx
  on public.employee_analysis_reports (profile_id)
  where profile_id is not null;

create index if not exists employee_analysis_reports_company_idx
  on public.employee_analysis_reports (company_id, last_generated_at desc);

alter table public.employee_analysis_reports enable row level security;

create policy "analysis reports visible to matching company"
on public.employee_analysis_reports
for select
to authenticated
using (
  public.is_superadmin()
  or public.same_company(company_id)
  or profile_id = auth.uid()
);

create policy "analysis reports managed by matching company"
on public.employee_analysis_reports
for all
to authenticated
using (
  public.is_superadmin()
  or public.same_company(company_id)
)
with check (
  public.is_superadmin()
  or public.same_company(company_id)
);
