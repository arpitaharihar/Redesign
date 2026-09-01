insert into public.subscription_plans (name, billing_cycle, base_price_inr, billing_mode, description, sort_order)
values
  ('Per Employee', 'monthly', 1200, 'per_employee', 'Monthly pricing that scales with active employees.', 1),
  ('Yearly Plan', 'yearly', 180000, 'flat', 'One-year flat contract for established teams.', 2),
  ('2 Year Plan', '24_months', 320000, 'flat', 'Discounted two-year commitment for long-term clients.', 3)
on conflict (name) do update
set billing_cycle = excluded.billing_cycle,
    base_price_inr = excluded.base_price_inr,
    billing_mode = excluded.billing_mode,
    description = excluded.description,
    sort_order = excluded.sort_order;

insert into public.pricing_rules (name, description, base_price_inr, sort_order)
values
  ('Starter Seat', 'Base monthly price applied per active employee under the per-employee plan.', 1200, 1),
  ('Yearly Company Contract', 'Recommended for stable organizations with predictable headcount.', 180000, 2),
  ('2 Year Company Contract', 'Discounted long-term platform pricing with locked rate.', 320000, 3)
on conflict (name) do update
set description = excluded.description,
    base_price_inr = excluded.base_price_inr,
    sort_order = excluded.sort_order;

insert into public.companies (name, code, contact_email, ats_threshold, status, notes)
values
  ('Nexora Systems', 'NEXORA', 'ops@nexora.com', 60, 'active', 'Reference demo company for hiring and workforce control.'),
  ('Vertex Digital', 'VERTEX', 'admin@vertex.com', 72, 'active', 'Reference demo company for projects and pricing.')
on conflict (code) do update
set name = excluded.name,
    contact_email = excluded.contact_email,
    ats_threshold = excluded.ats_threshold,
    status = excluded.status,
    notes = excluded.notes;

insert into public.company_subscriptions (company_id, plan_id, status, starts_on, ends_on, seats_purchased, price_override_inr)
select c.id, p.id, 'active', current_date, current_date + interval '1 year', 40, 180000
from public.companies c
join public.subscription_plans p on p.name = 'Yearly Plan'
where c.code = 'NEXORA'
on conflict do nothing;

insert into public.company_subscriptions (company_id, plan_id, status, starts_on, ends_on, seats_purchased, price_override_inr)
select c.id, p.id, 'active', current_date, current_date + interval '1 month', 25, 30000
from public.companies c
join public.subscription_plans p on p.name = 'Per Employee'
where c.code = 'VERTEX'
on conflict do nothing;

insert into public.job_openings (company_id, title, department, description, min_ats_score, status)
select id, 'Java Backend Developer', 'Engineering', 'Build backend workflows for SmartDesk modules.', 60, 'published'
from public.companies
where code = 'NEXORA'
on conflict do nothing;

insert into public.job_openings (company_id, title, department, description, min_ats_score, status)
select id, 'Frontend Engineer', 'Product Engineering', 'Own client-facing portals and dashboards.', 72, 'published'
from public.companies
where code = 'VERTEX'
on conflict do nothing;

insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select id, 'Hiring Ops Console', 'Internal', 'active', 450000, current_date - 14, current_date + 60
from public.companies
where code = 'NEXORA'
on conflict do nothing;

insert into public.projects (company_id, name, client_name, status, budget_inr, start_date, due_date)
select id, 'Client Success Portal', 'BlueCart', 'planned', 380000, current_date + 7, current_date + 120
from public.companies
where code = 'VERTEX'
on conflict do nothing;

insert into public.reviews (company_id, reviewer_name, feedback_type, rating, note)
select id, 'Nexora Leadership', 'platform_feedback', 5, 'The new admin structure gives clear visibility into hiring and employee operations.'
from public.companies
where code = 'NEXORA'
on conflict do nothing;

insert into public.reviews (company_id, reviewer_name, feedback_type, rating, note)
select id, 'Vertex PMO', 'pricing_feedback', 4, 'Per-employee pricing is easier to explain to finance than mixed spreadsheet billing.'
from public.companies
where code = 'VERTEX'
on conflict do nothing;

-- After you create auth users in Supabase Auth, run examples like:
-- select public.bootstrap_user_membership('superadmin@smartdesk.com', 'superadmin', null, 'Platform Owner');
-- select public.bootstrap_user_membership('admin@nexora.com', 'company_admin', 'NEXORA', 'Nexora Admin');
-- select public.bootstrap_user_membership('employee@nexora.com', 'employee', 'NEXORA', 'Nexora Employee');
