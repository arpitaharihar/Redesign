alter table public.job_openings
add column if not exists ats_keywords text,
add column if not exists shortlist_email_subject text,
add column if not exists shortlist_email_body text,
add column if not exists hire_email_subject text,
add column if not exists hire_email_body text,
add column if not exists reject_email_subject text,
add column if not exists reject_email_body text;

alter table public.job_applications
add column if not exists shortlisted_at timestamptz,
add column if not exists hired_at timestamptz,
add column if not exists rejected_at timestamptz;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.candidate_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.job_applications(id) on delete cascade,
  recipient_email text not null,
  temp_password text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.email_outbox enable row level security;
alter table public.candidate_credentials enable row level security;

create policy "company admins manage email outbox"
on public.email_outbox
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create policy "company admins manage candidate credentials"
on public.candidate_credentials
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));
