create or replace function public.get_company_public(company_code text)
returns table (
  id uuid,
  name text,
  code text,
  ats_threshold integer,
  status public.company_status
)
language sql
security definer
set search_path = public
as $$
  select id, name, code, ats_threshold, status
  from public.companies
  where code = upper(company_code)
  limit 1;
$$;

revoke all on function public.get_company_public(text) from public;
grant execute on function public.get_company_public(text) to anon, authenticated;
