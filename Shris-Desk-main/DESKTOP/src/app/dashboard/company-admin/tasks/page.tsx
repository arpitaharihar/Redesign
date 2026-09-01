import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { reviewTaskSubmissionAction, updateTaskAction } from "../actions";

type CompanyAdminTasksPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminTasksPage({
  searchParams,
}: CompanyAdminTasksPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [tasksResult, projectsResult, employeesResult, submissionsResult] = profile.companyId
    ? await Promise.all([
        supabase
          .from("tasks")
          .select(
            "id, title, description, status, priority, due_date, project_id, assignee_profile_id, projects(name), profiles!tasks_assignee_profile_id_fkey(full_name, email)",
          )
          .eq("company_id", profile.companyId)
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name").eq("company_id", profile.companyId).order("name"),
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("company_id", profile.companyId)
          .order("full_name"),
        supabase
          .from("task_submissions")
          .select(
            "id, task_id, submission_url, notes, created_at, status, feedback, profiles(full_name, email)",
          )
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const tasks = (tasksResult.data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    project_id: string | null;
    assignee_profile_id: string | null;
    projects?: { name?: string } | Array<{ name?: string }> | null;
    profiles?: { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
  }>;
  const projects = (projectsResult.data ?? []) as Array<{ id: string; name: string }>;
  const employees = (employeesResult.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string;
  }>;
  const taskIds = new Set(tasks.map((task) => task.id));
  const submissions = ((submissionsResult.data ?? []) as Array<{
    id: string;
    task_id: string;
    submission_url: string;
    notes: string | null;
    created_at: string;
    status: string;
    feedback: string | null;
    profiles?: { full_name?: string; email?: string } | Array<{ full_name?: string; email?: string }> | null;
  }>).filter((submission) => taskIds.has(submission.task_id));
  const submissionsByTask = submissions.reduce<Record<string, typeof submissions>>((acc, submission) => {
    if (!acc[submission.task_id]) {
      acc[submission.task_id] = [];
    }
    acc[submission.task_id].push(submission);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Tasks</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Update task status and review employee submissions.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="panel rounded-[30px] p-6">
        <h3 className="section-title">Task Review Queue</h3>
        <div className="mt-5 max-h-[760px] overflow-y-auto pr-2">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Task</th>
                <th className="pb-3 pr-4">Edit</th>
                <th className="pb-3 pr-4">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
                const assignee = Array.isArray(task.profiles) ? task.profiles[0] : task.profiles;

                return (
                  <tr key={task.id} className="border-t border-slate-200/70 align-top">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {project?.name ?? "General"} | {assignee?.full_name ?? assignee?.email ?? "Unassigned"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {task.description ?? "No description"}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                        {task.status.replace("_", " ")} | {task.priority} | Due {task.due_date ?? "Open"}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <form action={updateTaskAction} className="min-w-[320px] space-y-3">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/company-admin/tasks" />
                        <input className="input-base" name="title" defaultValue={task.title} required />
                        <textarea className="input-base min-h-20" name="description" defaultValue={task.description ?? ""} />
                        <select className="input-base" name="projectId" defaultValue={task.project_id ?? ""}>
                          <option value="">No project</option>
                          {projects.map((projectOption) => (
                            <option key={projectOption.id} value={projectOption.id}>
                              {projectOption.name}
                            </option>
                          ))}
                        </select>
                        <select className="input-base" name="assigneeProfileId" defaultValue={task.assignee_profile_id ?? ""}>
                          <option value="">Unassigned</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.full_name ?? employee.email}
                            </option>
                          ))}
                        </select>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select className="input-base" name="status" defaultValue={task.status}>
                            <option value="todo">To do</option>
                            <option value="in_progress">In progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </select>
                          <select className="input-base" name="priority" defaultValue={task.priority}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        <input className="input-base" type="date" name="dueDate" defaultValue={task.due_date ?? ""} />
                        <button className="button-primary w-full" type="submit">
                          Update Task
                        </button>
                      </form>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="max-h-[460px] min-w-[360px] space-y-3 overflow-y-auto pr-2">
                        {(submissionsByTask[task.id] ?? []).length === 0 ? (
                          <p className="text-sm text-slate-500">No submissions yet.</p>
                        ) : null}
                        {(submissionsByTask[task.id] ?? []).map((submission) => {
                          const submitter = Array.isArray(submission.profiles)
                            ? submission.profiles[0]
                            : submission.profiles;

                          return (
                            <article key={submission.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                              <p className="font-semibold text-slate-900">
                                {submitter?.full_name ?? submitter?.email ?? "Employee"}
                              </p>
                              <a className="mt-2 block break-all text-sm text-emerald-700" href={submission.submission_url} target="_blank" rel="noreferrer">
                                {submission.submission_url}
                              </a>
                              {submission.notes ? (
                                <p className="mt-2 text-sm leading-6 text-slate-600">{submission.notes}</p>
                              ) : null}
                              <form action={reviewTaskSubmissionAction} className="mt-3 space-y-2">
                                <input type="hidden" name="submissionId" value={submission.id} />
                                <input type="hidden" name="redirectTo" value="/dashboard/company-admin/tasks" />
                                <select className="input-base" name="status" defaultValue={submission.status}>
                                  <option value="accepted">Accepted</option>
                                  <option value="needs_changes">Needs changes</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                                <textarea className="input-base min-h-20" name="feedback" defaultValue={submission.feedback ?? ""} placeholder="Review feedback" />
                                <button className="button-secondary w-full" type="submit">
                                  Save Review
                                </button>
                              </form>
                            </article>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
