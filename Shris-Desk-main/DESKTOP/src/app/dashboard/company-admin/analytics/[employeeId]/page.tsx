import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AnalyticsProgress } from "@/components/analytics-progress";
import { MetricCard } from "@/components/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { reviewTaskSubmissionAction } from "@/app/dashboard/company-admin/actions";
import { requireProfile } from "@/lib/auth";
import {
  buildLiveEmployeeInsight,
  getProfileAnalysisReports,
} from "@/lib/employee-analysis-reports";
import { getCompanyAnalyticsBundle, getEmployeeAnalytics } from "@/lib/employee-analytics";

type CompanyAdminEmployeeAnalyticsPageProps = {
  params: Promise<{
    employeeId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "NA";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

export default async function CompanyAdminEmployeeAnalyticsPage({
  params,
  searchParams,
}: CompanyAdminEmployeeAnalyticsPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin" || !profile.companyId) {
    redirect("/dashboard");
  }

  const [{ employeeId }, query] = await Promise.all([params, searchParams]);
  const [analytics, bundle] = await Promise.all([
    getEmployeeAnalytics(profile.companyId, employeeId),
    getCompanyAnalyticsBundle(profile.companyId),
  ]);

  if (!analytics) {
    notFound();
  }

  const reportMap = await getProfileAnalysisReports(profile.companyId, [employeeId]);
  const baselineReport = reportMap.get(employeeId) ?? null;
  const insight = buildLiveEmployeeInsight({
    analytics,
    baselineReport,
  });

  const queuedSubmissions = bundle.reviewQueue.filter(
    (submission) => submission.employeeId === employeeId,
  );

  return (
    <div className="space-y-6">
      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-3">
              <span className="eyebrow">Individual Employee Analysis</span>
              <Link className="button-secondary" href="/dashboard/company-admin/analytics">
                Back To Analytics Hub
              </Link>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              {analytics.profile.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {analytics.profile.department ?? "General"} | {analytics.profile.email}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{analytics.headline}</p>
            <div className="mt-6">
              <StatusBanner error={query.error} success={query.success} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] xl:min-w-[320px]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Performance Score
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-slate-950">
              {analytics.performanceScore}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Attendance, work quality, collaboration, delivery movement, and review outcomes are
              all reflected in this score.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Attendance"
          value={`${analytics.attendanceRate}%`}
          hint={`${analytics.presentDays}/${analytics.totalAttendanceDays} tracked days`}
        />
        <MetricCard
          label="Working Time"
          value={`${analytics.avgHoursPerDay}h`}
          hint={`${analytics.totalHours} total hours`}
        />
        <MetricCard
          label="Delivery"
          value={`${analytics.completedTasks}/${analytics.totalTasks}`}
          hint={`${analytics.overdueTasks} overdue | ${analytics.reviewTasks} in review`}
        />
        <MetricCard
          label="Review Quality"
          value={analytics.reviewedSubmissions ? `${analytics.submissionAcceptanceRate}%` : "NA"}
          hint={`${analytics.pendingReviewSubmissions} awaiting admin decision`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <AnalyticsProgress
          label="Attendance Discipline"
          value={analytics.attendanceRate}
          subtitle={`Late ${analytics.lateDays}, leave ${analytics.leaveDays}, punctuality ${analytics.punctualityScore}`}
          colorClass="from-emerald-500 to-green-600"
        />
        <AnalyticsProgress
          label="Focus & Activity"
          value={Math.round((analytics.focusScore + analytics.activityScore) / 2)}
          subtitle={`Focus ${analytics.focusScore}, activity ${analytics.activityScore}`}
          colorClass="from-cyan-500 to-sky-600"
        />
        <AnalyticsProgress
          label="Submission Acceptance"
          value={analytics.reviewedSubmissions ? analytics.submissionAcceptanceRate : 0}
          subtitle={`${analytics.acceptedSubmissions} accepted, ${analytics.needsChangesSubmissions} needs changes, ${analytics.rejectedSubmissions} rejected`}
          colorClass="from-amber-500 to-orange-600"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Admin Recommendation</h3>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {insight.label} ({insight.score})
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">{insight.summary}</p>
          <p className="mt-4 text-sm leading-7 text-slate-700">{insight.recommendation}</p>
          <div className="mt-5 space-y-2 text-sm text-slate-600">
            {insight.actions.map((action) => (
              <p key={action}>- {action}</p>
            ))}
          </div>
        </article>

        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Initial Hiring Analysis</h3>
          {baselineReport ? (
            <>
              <p className="mt-3 text-sm leading-7 text-slate-600">{baselineReport.summary}</p>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {baselineReport.adminRecommendation}
              </p>
              <div className="mt-5 space-y-2 text-sm text-slate-600">
                {baselineReport.strengths.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-7 text-slate-500">
              No ATS or hired-baseline analysis report is linked to this employee yet.
            </p>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Recent Attendance</h3>
          <div className="mt-5 space-y-3">
            {analytics.recentAttendance.map((day) => (
              <div
                key={day.date}
                className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{formatDate(day.date)}</p>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {day.status.replace("_", " ")}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <p>Check-in: {formatTime(day.checkInAt)}</p>
                    <p>Check-out: {formatTime(day.checkOutAt)}</p>
                    <p>Tracked: {formatHours(day.workMinutes)}</p>
                  </div>
                </div>
                {day.notes ? (
                  <p className="mt-3 text-sm leading-7 text-slate-500">{day.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Project Load</h3>
          <div className="mt-5 space-y-3">
            {analytics.projectMemberships.length === 0 ? (
              <p className="text-sm leading-7 text-slate-500">
                No project memberships are mapped for this employee yet.
              </p>
            ) : (
              analytics.projectMemberships.map((project) => (
                <div
                  key={`${project.projectId}-${project.roleInProject}`}
                  className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
                >
                  <p className="font-semibold text-slate-900">{project.projectName}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {project.clientName} | {project.roleInProject} |{" "}
                    {project.projectStatus.replace("_", " ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Tracked Work Sessions</h3>
          <div className="mt-5 space-y-3">
            {analytics.recentSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{session.projectName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(session.date)} | {formatTime(session.startedAt)} to{" "}
                      {formatTime(session.endedAt)}
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <p>Duration: {formatHours(session.durationMinutes)}</p>
                    <p>Focus: {session.focusScore}</p>
                    <p>Activity: {session.activityScore}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Submission History</h3>
          <div className="mt-5 space-y-3">
            {analytics.recentSubmissions.length === 0 ? (
              <p className="text-sm leading-7 text-slate-500">
                No submissions are available for this employee yet.
              </p>
            ) : (
              analytics.recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{submission.taskTitle}</p>
                      <p className="mt-1 text-sm capitalize text-slate-500">
                        {submission.status.replace("_", " ")} | Submitted{" "}
                        {formatDate(submission.createdAt)}
                      </p>
                    </div>
                    <a
                      className="button-secondary"
                      href={submission.submissionUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open Link
                    </a>
                  </div>
                  {submission.feedback ? (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Review: {submission.feedback}
                    </p>
                  ) : null}
                  {submission.notes ? (
                    <p className="mt-2 text-sm leading-7 text-slate-500">{submission.notes}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="panel rounded-[30px] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h3 className="section-title">Pending Review Actions</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Review current pending submissions for this employee without leaving the detail view.
            </p>
          </div>
          <p className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm text-slate-600">
            {queuedSubmissions.length} pending review item(s)
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {queuedSubmissions.length === 0 ? (
            <p className="text-sm leading-7 text-slate-500">
              There are no pending review items for this employee right now.
            </p>
          ) : (
            queuedSubmissions.map((submission) => (
              <article
                key={submission.id}
                className="rounded-[26px] border border-slate-200/70 bg-white/90 p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {submission.projectName}
                    </p>
                    <h4 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {submission.taskTitle}
                    </h4>
                    <p className="text-sm text-slate-600">
                      Priority {submission.taskPriority} | Task{" "}
                      {submission.taskStatus.replace("_", " ")} | Due {submission.dueDate ?? "Open"}
                    </p>
                    {submission.notes ? (
                      <p className="text-sm leading-7 text-slate-600">{submission.notes}</p>
                    ) : null}
                  </div>

                  <form action={reviewTaskSubmissionAction} className="w-full max-w-md space-y-3">
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <input
                      type="hidden"
                      name="redirectTo"
                      value={`/dashboard/company-admin/analytics/${employeeId}`}
                    />
                    <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
                      <select className="input-base" name="status" defaultValue="accepted">
                        <option value="accepted">Accept Submission</option>
                        <option value="needs_changes">Needs Changes</option>
                        <option value="rejected">Reject Submission</option>
                      </select>
                      <a
                        className="button-secondary"
                        href={submission.submissionUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Delivery Link
                      </a>
                    </div>
                    <textarea
                      className="input-base min-h-24"
                      name="feedback"
                      placeholder="Reviewer feedback for the employee"
                    />
                    <button className="button-primary w-full" type="submit">
                      Save Review Decision
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
