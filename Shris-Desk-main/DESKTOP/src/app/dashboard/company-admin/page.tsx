import Link from "next/link";
import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompanyAdminPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminPage({ searchParams }: CompanyAdminPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  let company:
    | {
        name?: string | null;
        code?: string | null;
        ats_threshold?: number | null;
        contact_email?: string | null;
        status?: string | null;
      }
    | null = null;
  let employees: Array<{
    full_name?: string | null;
    email?: string | null;
    role?: string | null;
    face_enrolled?: boolean | null;
    profile_completed?: boolean | null;
  }> = [];
  let projects: Array<{
    name?: string | null;
    client_name?: string | null;
    status?: string | null;
    budget_inr?: number | null;
  }> = [];
  let tasks: Array<{
    title?: string | null;
    status?: string | null;
    priority?: string | null;
    due_date?: string | null;
  }> = [];
  let applications: Array<{
    full_name?: string | null;
    desired_role?: string | null;
    status?: string | null;
    ats_score?: number | null;
    ats_threshold_at_submission?: number | null;
  }> = [];

  if (profile.companyId) {
    const [companyResult, employeesResult, projectsResult, tasksResult, applicationsResult] =
      await Promise.all([
        supabase
          .from("companies")
          .select("name, code, ats_threshold, contact_email, status")
          .eq("id", profile.companyId)
          .single(),
        supabase
          .from("profiles")
          .select("full_name, email, role, face_enrolled, profile_completed")
          .eq("company_id", profile.companyId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("projects")
          .select("name, client_name, status, budget_inr")
          .eq("company_id", profile.companyId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("tasks")
          .select("title, status, priority, due_date")
          .eq("company_id", profile.companyId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("job_applications")
          .select("full_name, desired_role, status, ats_score, ats_threshold_at_submission")
          .eq("company_id", profile.companyId)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    company = companyResult.data;
    employees = employeesResult.data ?? [];
    projects = projectsResult.data ?? [];
    tasks = tasksResult.data ?? [];
    applications = applicationsResult.data ?? [];
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Company Admin Console</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Manage employees, projects, access, and hiring for {company?.name ?? "your company"}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Company code: {company?.code ?? "NA"} | Contact: {company?.contact_email ?? "NA"} |
          Status: {company?.status ?? "NA"}
        </p>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Your company admin profile is not linked to a company yet. Ask a superadmin to assign
            the company before managing employees and projects.
          </p>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Employees"
            value={String(employees.length)}
            hint="Recent active user records"
          />
          <MetricCard
            label="Projects"
            value={String(projects.length)}
            hint="Tracked delivery initiatives"
          />
          <MetricCard
            label="Tasks"
            value={String(tasks.length)}
            hint="Recent work assignments"
          />
          <MetricCard
            label="ATS Threshold"
            value={`${company?.ats_threshold ?? 0}%`}
            hint="Company-specific hiring gate"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/dashboard/company-admin/employees">
            Manage Employees
          </Link>
          <Link className="button-secondary" href="/dashboard/company-admin/projects">
            Manage Projects
          </Link>
          <Link className="button-secondary" href="/dashboard/company-admin/analytics">
            View Analytics
          </Link>
          <Link className="button-secondary" href="/dashboard/company-admin/hiring">
            Manage Hiring
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Employee Access Snapshot"
          lines={employees.map(
            (employee) =>
              `${employee.full_name ?? employee.email} | ${employee.role} | Face: ${
                employee.face_enrolled ? "Yes" : "No"
              } | Profile: ${employee.profile_completed ? "Complete" : "Pending"}`,
          )}
          emptyMessage="No employees added yet."
        />
        <SectionCard
          title="Project Portfolio"
          lines={projects.map(
            (project) =>
              `${project.name} | ${project.client_name ?? "Internal"} | ${project.status} | Budget: INR ${
                project.budget_inr ?? 0
              }`,
          )}
          emptyMessage="No projects tracked yet."
        />
        <SectionCard
          title="Task Queue"
          lines={tasks.map(
            (task) =>
              `${task.title} | ${task.status} | ${task.priority} | Due: ${task.due_date ?? "Not set"}`,
          )}
          emptyMessage="No tasks queued yet."
        />
        <SectionCard
          title="Hiring Applications"
          lines={applications.map(
            (application) =>
              `${application.full_name} | ${application.desired_role} | ${application.status} | ATS ${
                application.ats_score ?? 0
              } / ${application.ats_threshold_at_submission ?? 0}`,
          )}
          emptyMessage="No applications yet."
        />
      </section>
    </div>
  );
}
