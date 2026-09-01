create or replace function public.submit_job_application_public(
  company_code text,
  opening_id uuid,
  full_name text,
  email text,
  phone text,
  desired_role text,
  resume_link text,
  cover_letter text,
  ats_score numeric,
  ats_threshold integer,
  status public.application_status
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  company_id uuid;
  application_id uuid;
begin
  select id into company_id
  from public.companies
  where code = upper(company_code)
  limit 1;

  if company_id is null then
    raise exception 'Company not found';
  end if;

  if not exists (
    select 1
    from public.job_openings jo
    where jo.id = opening_id
      and jo.company_id = company_id
      and jo.status = 'published'
  ) then
    raise exception 'Opening not available';
  end if;

  insert into public.job_applications (
    company_id,
    opening_id,
    full_name,
    email,
    phone,
    desired_role,
    resume_link,
    cover_letter,
    ats_score,
    ats_threshold_at_submission,
    status
  )
  values (
    company_id,
    opening_id,
    full_name,
    email,
    phone,
    desired_role,
    resume_link,
    cover_letter,
    ats_score,
    ats_threshold,
    status
  )
  returning id into application_id;

  return application_id;
end;
$$;

revoke all on function public.submit_job_application_public(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  integer,
  public.application_status
) from public;
grant execute on function public.submit_job_application_public(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  integer,
  public.application_status
) to anon, authenticated;
