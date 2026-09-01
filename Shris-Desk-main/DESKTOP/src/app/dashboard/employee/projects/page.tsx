import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

type EmployeeProjectsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EmployeeProjectsPage({
  searchParams,
}: EmployeeProjectsPageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("project_members")
    .select("role_in_project, projects(name, status, client_name, budget_inr, due_date)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const memberships = (data ?? []) as Array<{
    role_in_project: string;
    projects?:
      | {
          name?: string;
          status?: string;
          client_name?: string;
          budget_inr?: number | null;
          due_date?: string | null;
        }
      | Array<{
          name?: string;
          status?: string;
          client_name?: string;
          budget_inr?: number | null;
          due_date?: string | null;
        }>
      | null;
  }>;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Projects</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Your active project memberships
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {memberships.map((membership, index) => {
          const project = Array.isArray(membership.projects)
            ? membership.projects[0]
            : membership.projects;

          return (
            <article key={`${project?.name ?? "project"}-${index}`} className="panel-strong rounded-[28px] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {membership.role_in_project}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {project?.name ?? "Unknown project"}
              </h3>
              <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                <p>Client: {project?.client_name ?? "Internal"}</p>
                <p>Status: {project?.status ?? "Unknown"}</p>
                <p>Budget: {money(project?.budget_inr ?? 0)}</p>
                <p>Due: {project?.due_date ?? "Open"}</p>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
