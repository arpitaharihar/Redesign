import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { submitTaskSubmissionAction } from "../actions";

type EmployeeTasksPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EmployeeTasksPage({
  searchParams,
}: EmployeeTasksPageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, projects(name)")
    .eq("assignee_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const tasks = (data ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    projects?: { name?: string } | Array<{ name?: string }> | null;
  }>;

  const taskIds = tasks.map((task) => task.id);
  const submissionsResult = taskIds.length
    ? await supabase
        .from("task_submissions")
        .select("id, task_id, submission_url, notes, created_at, status")
        .in("task_id", taskIds)
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const submissions = (submissionsResult.data ?? []) as Array<{
    id: string;
    task_id: string;
    submission_url: string;
    notes: string | null;
    created_at: string;
    status: string;
  }>;

  const submissionsByTask = submissions.reduce<Record<string, typeof submissions>>((acc, item) => {
    if (!acc[item.task_id]) {
      acc[item.task_id] = [];
    }
    acc[item.task_id].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Tasks</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Track your work and submit delivery links for review.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="space-y-4">
        {tasks.map((task) => {
          const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;

          return (
            <article key={task.id} className="panel-strong rounded-[28px] p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {project?.name ?? "General work"}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    {task.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    {task.description ?? "No additional description"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>Status: {task.status.replace("_", " ")}</span>
                    <span>Priority: {task.priority}</span>
                    <span>Due: {task.due_date ?? "Open"}</span>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <form action={submitTaskSubmissionAction} className="space-y-3">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="redirectTo" value="/dashboard/employee/tasks" />
                    <input
                      className="input-base"
                      name="submissionUrl"
                      placeholder="Submission link"
                    />
                    <textarea
                      className="input-base min-h-20"
                      name="notes"
                      placeholder="Submission notes"
                    />
                    <button className="button-secondary w-full" type="submit">
                      Submit Work
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200/70 pt-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Your Submissions
                </p>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  {(submissionsByTask[task.id] ?? []).length === 0 ? (
                    <p>No submissions yet.</p>
                  ) : (
                    (submissionsByTask[task.id] ?? []).map((submission) => (
                      <div
                        key={submission.id}
                        className="rounded-[18px] border border-slate-200 bg-white/80 px-4 py-3"
                      >
                        <p className="font-medium text-slate-800">
                          {submission.status.replace("_", " ")} |{" "}
                          {new Intl.DateTimeFormat("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(submission.created_at))}
                        </p>
                        <p className="mt-2 break-all text-slate-600">
                          {submission.submission_url}
                        </p>
                        {submission.notes ? (
                          <p className="mt-2 text-slate-500">{submission.notes}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
