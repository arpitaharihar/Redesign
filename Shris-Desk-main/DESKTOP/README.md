# SmartDesk v2

SmartDesk v2 is a clean restart of the project using:

- `Next.js 16 + TypeScript`
- `Supabase Auth + Postgres + RLS`
- `Public hiring intake`
- `Superadmin and Company Admin dashboards`

## What Is Included

- Public landing page
- Public candidate application page
- Supabase email/password authentication
- Role-aware routing for `superadmin`, `company_admin`, and `employee`
- SQL schema for companies, subscriptions, profiles, projects, tasks, openings, applications, and reviews
- Demo seed data and role-bootstrap helper SQL

## How To Run

1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - [`supabase/migrations/20260405_0001_initial_schema.sql`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/supabase/migrations/20260405_0001_initial_schema.sql)
   - all newer migration files in order through [`supabase/migrations/20260407_0015_employee_analysis_reports.sql`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/supabase/migrations/20260407_0015_employee_analysis_reports.sql)
   - [`supabase/seed/20260405_0001_demo_seed.sql`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/supabase/seed/20260405_0001_demo_seed.sql)
   - [`supabase/seed/20260407_0002_employee_analytics_seed.sql`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/supabase/seed/20260407_0002_employee_analytics_seed.sql)
   - [`supabase/seed/20260630_0003_employee_daily_activity_to_june_30.sql`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/supabase/seed/20260630_0003_employee_daily_activity_to_june_30.sql)
3. Copy `.env.example` to `.env.local`.
4. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Install packages:
   - `npm install`
6. Start the app:
   - `npm run dev`
7. Open:
   - `http://localhost:3000`

## Desktop App

SmartDesk can now run as a Windows desktop application from the same `smartdesk-v2` codebase.

1. Install dependencies:
   - `npm install`
2. For desktop runtime config, copy:
   - [`smartdesk-desktop.env.example`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/smartdesk-desktop.env.example)
   - to `smartdesk-desktop.env`
3. In development, run:
   - `npm run dev:desktop`
4. To generate the Windows installer (`.exe`), run:
   - `npm run build:desktop`
5. The installer will be created in:
   - `desktop-dist/`
6. The build now prepares a runtime env file automatically:
   - `smartdesk-desktop.env`
   - This is included in the installer so server-side desktop routes such as face authentication can load correctly.

The packaged app starts its own local Next server and opens SmartDesk in an Electron shell, so the desktop app uses the same routes, authentication flow, analytics, and face recognition flow as the web app.

## Admin Bootstrap

After creating auth users from the `/login` page or Supabase Auth dashboard, assign their roles in SQL:

```sql
select public.bootstrap_user_membership('superadmin@smartdesk.com', 'superadmin', null, 'Platform Owner');
select public.bootstrap_user_membership('admin@nexora.com', 'company_admin', 'NEXORA', 'Nexora Admin');
select public.bootstrap_user_membership('employee@nexora.com', 'employee', 'NEXORA', 'Nexora Employee');
```

## Important Notes

- The ATS engine is not yet implemented. The application table stores submissions and threshold context so ATS logic can plug in next.
- Face recognition is intentionally separated from the core platform in this restart. The next recommended step is a Python microservice that updates `profiles.face_enrolled`.
- If your local Node version has trouble with Next 16, upgrade to Node `20.19+` or Node `22`.
- For desktop packaging, use Windows with Node `20.19+` or Node `22`, then run `npm run build:desktop`.

## Security Script

For Windows endpoint hardening, use:
- [`scripts/security/manage-external-devices.ps1`](D:/MyProjects/FinalProject/finalyearproject/finalyear/finalyear/SmartDesk/smartdesk-v2/scripts/security/manage-external-devices.ps1)

Examples:
- Check status:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\security\manage-external-devices.ps1 -Mode Status`
- Restrict removable external storage:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\security\manage-external-devices.ps1 -Mode Lockdown`
- Restore access:
  - `powershell -ExecutionPolicy Bypass -File .\scripts\security\manage-external-devices.ps1 -Mode Restore`
