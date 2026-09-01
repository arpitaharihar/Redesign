import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EmployeePageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [tasksResult, membershipsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("title, status, priority, due_date")
      .eq("assignee_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("project_members")
      .select("role_in_project, projects(name, status, client_name)")
      .eq("profile_id", profile.id)
      .limit(8),
  ]);

  const tasks = tasksResult.data ?? [];
  const memberships = membershipsResult.data ?? [];

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Employee Workspace</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Personal task and project visibility for {profile.fullName ?? profile.email}
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Company"
            value={profile.companyCode ?? "Unassigned"}
            hint={profile.companyName ?? "No company mapped yet"}
          />
          <MetricCard
            label="Face Login"
            value={profile.faceEnrolled ? "Enabled" : "Pending"}
            hint="Biometric onboarding state"
          />
          <MetricCard
            label="Profile"
            value={profile.profileCompleted ? "Complete" : "Pending"}
            hint="Profile completion requirement"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/dashboard/employee/chat">
            Open Chat
          </Link>
          <Link className="button-secondary" href="/dashboard/employee/analytics">
            View Analytics
          </Link>
          <Link className="button-secondary" href="/dashboard/employee/meetings">
            Join Meetings
          </Link>
          <Link className="button-secondary" href="/dashboard/employee/tasks">
            View Tasks
          </Link>
          <Link className="button-secondary" href="/dashboard/employee/settings">
            Update Settings
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Assigned Tasks"
          lines={tasks.map(
            (task) =>
              `${task.title} | ${task.status} | ${task.priority} | Due: ${task.due_date ?? "Not set"}`,
          )}
        />
        <SectionCard
          title="Project Memberships"
          lines={memberships.map((membership) => {
            const project = Array.isArray(membership.projects)
              ? membership.projects[0]
              : membership.projects;
            return `${project?.name ?? "Unknown"} | ${membership.role_in_project} | ${
              project?.status ?? "Unknown"
            } | ${project?.client_name ?? "Internal"}`;
          })}
        />
      </section>
    </div>
  );
}
