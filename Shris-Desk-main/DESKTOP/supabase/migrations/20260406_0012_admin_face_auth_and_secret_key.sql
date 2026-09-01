alter table public.profiles
  add column if not exists face_hash text,
  add column if not exists face_image_url text,
  add column if not exists face_registered_at timestamptz,
  add column if not exists face_last_verified_at timestamptz;

create table if not exists public.company_login_secrets (
  company_id uuid primary key references public.companies(id) on delete cascade,
  secret_hash text not null,
  last_rotated_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.company_login_secrets enable row level security;

create policy "company admins manage login secrets"
on public.company_login_secrets
for all
to authenticated
using (public.is_superadmin() or public.same_company(company_id))
with check (public.is_superadmin() or public.same_company(company_id));

create or replace function public.generate_company_login_secret()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_company_id uuid;
  new_secret text;
begin
  target_company_id := public.current_company_id();
  if target_company_id is null then
    raise exception 'No company assigned to current user';
  end if;

  new_secret := encode(gen_random_bytes(8), 'hex');

  insert into public.company_login_secrets (company_id, secret_hash, last_rotated_at)
  values (target_company_id, crypt(new_secret, gen_salt('bf')), timezone('utc', now()))
  on conflict (company_id) do update
  set secret_hash = excluded.secret_hash,
      last_rotated_at = excluded.last_rotated_at,
      last_used_at = null;

  return new_secret;
end;
$$;

create or replace function public.validate_company_login_secret(
  target_company_code text,
  provided_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  target_company_id uuid;
  stored_hash text;
  next_secret text;
begin
  if target_company_code is null or provided_secret is null then
    return jsonb_build_object('valid', false);
  end if;

  select id into target_company_id
  from public.companies
  where code = upper(target_company_code)
  limit 1;

  if target_company_id is null then
    return jsonb_build_object('valid', false);
  end if;

  select secret_hash into stored_hash
  from public.company_login_secrets
  where company_id = target_company_id;

  if stored_hash is null then
    return jsonb_build_object('valid', false);
  end if;

  if stored_hash = crypt(provided_secret, stored_hash) then
    next_secret := encode(gen_random_bytes(8), 'hex');

    update public.company_login_secrets
    set secret_hash = crypt(next_secret, gen_salt('bf')),
        last_used_at = timezone('utc', now()),
        last_rotated_at = timezone('utc', now())
    where company_id = target_company_id;

    return jsonb_build_object('valid', true, 'next_secret', next_secret);
  end if;

  return jsonb_build_object('valid', false);
end;
$$;

revoke all on function public.generate_company_login_secret() from public;
revoke all on function public.validate_company_login_secret(text, text) from public;
grant execute on function public.generate_company_login_secret() to authenticated;
grant execute on function public.validate_company_login_secret(text, text) to anon, authenticated;
