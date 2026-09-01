create table if not exists public.employee_face_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  descriptor_samples jsonb not null default '[]'::jsonb,
  sample_count integer not null default 0 check (sample_count between 0 and 12),
  enrollment_meta jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.employee_face_login_challenges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  challenge_hash text not null unique,
  requested_ip text,
  user_agent text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists employee_face_login_challenges_profile_idx
  on public.employee_face_login_challenges (profile_id, created_at desc);

alter table public.employee_face_profiles enable row level security;
alter table public.employee_face_login_challenges enable row level security;

create policy "face profiles visible to owner and company"
on public.employee_face_profiles
for select
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
  or public.same_company(company_id)
);

create policy "face profiles managed by owner"
on public.employee_face_profiles
for all
to authenticated
using (
  public.is_superadmin()
  or profile_id = auth.uid()
)
with check (
  public.is_superadmin()
  or profile_id = auth.uid()
);
