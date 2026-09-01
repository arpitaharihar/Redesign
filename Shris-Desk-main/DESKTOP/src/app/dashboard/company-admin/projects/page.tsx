import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createProjectAction, createTaskAction, updateProjectAction } from "../actions";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

type ProjectsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let projects: Array<{
    id: string;
    name: string;
    client_name: string | null;
    status: string;
    budget_inr: number | null;
    start_date: string | null;
    due_date: string | null;
  }> = [];
  let tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    projects?: { name?: string } | Array<{ name?: string }> | null;
    profiles?: { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
  }> = [];
  let employees: Array<{
    id: string;
    full_name: string | null;
    email: string;
  }> = [];

  if (profile.companyId) {
    const [projectsResult, tasksResult, employeesResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, client_name, status, budget_inr, start_date, due_date")
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, projects(name), profiles!tasks_assignee_profile_id_fkey(full_name, email)",
        )
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("company_id", profile.companyId)
        .order("full_name"),
    ]);

    projects = (projectsResult.data ?? []) as Array<{
      id: string;
      name: string;
      client_name: string | null;
      status: string;
      budget_inr: number | null;
      start_date: string | null;
      due_date: string | null;
    }>;
    tasks = (tasksResult.data ?? []) as Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      due_date: string | null;
      projects?: { name?: string } | Array<{ name?: string }> | null;
      profiles?:
        | { full_name?: string; email?: string }
        | Array<{ full_name?: string; email?: string }>
        | null;
    }>;
    employees = (employeesResult.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string;
    }>;
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Projects</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Plan delivery work and assign tasks to your team.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Assign a company to this admin profile before creating projects and tasks.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Project Portfolio</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Project</th>
                  <th className="pb-3 pr-4">Client</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Budget</th>
                  <th className="pb-3 pr-4">Timeline</th>
                  <th className="pb-3 pr-4">Edit</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-200/70 align-top">
                    <td className="py-3 pr-4 font-medium">{project.name}</td>
                    <td className="py-3 pr-4">{project.client_name ?? "Internal"}</td>
                    <td className="py-3 pr-4 capitalize">{project.status.replace("_", " ")}</td>
                    <td className="py-3 pr-4">{money(project.budget_inr)}</td>
                    <td className="py-3 pr-4">
                      {project.start_date ?? "NA"} to {project.due_date ?? "Open"}
                    </td>
                    <td className="py-3 pr-4">
                      <details className="min-w-[320px] rounded-[18px] border border-slate-200 bg-white p-3">
                        <summary className="cursor-pointer font-semibold text-slate-700">Edit</summary>
                        <form action={updateProjectAction} className="mt-4 space-y-3">
                          <input type="hidden" name="projectId" value={project.id} />
                          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/projects" />
                          <input className="input-base" name="name" defaultValue={project.name} required />
                          <input className="input-base" name="clientName" defaultValue={project.client_name ?? ""} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select className="input-base" name="status" defaultValue={project.status}>
                              <option value="planned">Planned</option>
                              <option value="active">Active</option>
                              <option value="on_hold">On hold</option>
                              <option value="completed">Completed</option>
                            </select>
                            <input className="input-base" type="number" min="0" step="0.01" name="budgetInr" defaultValue={project.budget_inr ?? ""} />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input className="input-base" type="date" name="startDate" defaultValue={project.start_date ?? ""} />
                            <input className="input-base" type="date" name="dueDate" defaultValue={project.due_date ?? ""} />
                          </div>
                          <button className="button-primary w-full" type="submit">
                            Update Project
                          </button>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form action={createProjectAction} className="panel-strong rounded-[30px] p-6">
          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/projects" />
          <h3 className="section-title">Create Project</h3>
          <div className="mt-5 space-y-4">
            <input
              className="input-base"
              name="name"
              placeholder="Project name"
              disabled={!profile.companyId}
            />
            <input
              className="input-base"
              name="clientName"
              placeholder="Client name"
              disabled={!profile.companyId}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="input-base"
                name="status"
                defaultValue="planned"
                disabled={!profile.companyId}
              >
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
                <option value="completed">Completed</option>
              </select>
              <input
                className="input-base"
                type="number"
                min="0"
                step="0.01"
                name="budgetInr"
                placeholder="Budget"
                disabled={!profile.companyId}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="input-base"
                type="date"
                name="startDate"
                disabled={!profile.companyId}
              />
              <input
                className="input-base"
                type="date"
                name="dueDate"
                disabled={!profile.companyId}
              />
            </div>
            <button
              className="button-primary w-full"
              type="submit"
              disabled={!profile.companyId}
            >
              Save Project
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Task Queue</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Task</th>
                  <th className="pb-3 pr-4">Project</th>
                  <th className="pb-3 pr-4">Assignee</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Priority</th>
                  <th className="pb-3 pr-4">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
                  const assignee = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles;

                  return (
                    <tr key={task.id} className="border-t border-slate-200/70">
                      <td className="py-3 pr-4 font-medium">{task.title}</td>
                      <td className="py-3 pr-4">{project?.name ?? "General"}</td>
                      <td className="py-3 pr-4">{assignee?.full_name ?? assignee?.email ?? "Unassigned"}</td>
                      <td className="py-3 pr-4 capitalize">{task.status.replace("_", " ")}</td>
                      <td className="py-3 pr-4 capitalize">{task.priority}</td>
                      <td className="py-3 pr-4">{task.due_date ?? "Open"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form action={createTaskAction} className="panel-strong rounded-[30px] p-6">
          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/projects" />
          <h3 className="section-title">Create Task</h3>
          <div className="mt-5 space-y-4">
            <input
              className="input-base"
              name="title"
              placeholder="Task title"
              disabled={!profile.companyId}
            />
            <textarea
              className="input-base min-h-24"
              name="description"
              placeholder="Task description"
              disabled={!profile.companyId}
            />
            <select
              className="input-base"
              name="projectId"
              defaultValue=""
              disabled={!profile.companyId}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              className="input-base"
              name="assigneeProfileId"
              defaultValue=""
              disabled={!profile.companyId}
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name ?? employee.email}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                className="input-base"
                name="status"
                defaultValue="todo"
                disabled={!profile.companyId}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              <select
                className="input-base"
                name="priority"
                defaultValue="medium"
                disabled={!profile.companyId}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <input
              className="input-base"
              type="date"
              name="dueDate"
              disabled={!profile.companyId}
            />
            <button
              className="button-primary w-full"
              type="submit"
              disabled={!profile.companyId}
            >
              Save Task
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
