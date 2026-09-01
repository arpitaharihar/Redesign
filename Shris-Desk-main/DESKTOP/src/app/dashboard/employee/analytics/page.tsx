import Link from "next/link";

import { AnalyticsProgress } from "@/components/analytics-progress";
import { MetricCard } from "@/components/metric-card";
import { StatusBanner } from "@/components/status-banner";
import {
  buildLiveEmployeeInsight,
  getProfileAnalysisReports,
} from "@/lib/employee-analysis-reports";
import { getEmployeeAnalytics } from "@/lib/employee-analytics";
import { requireEmployeeProfile } from "@/lib/auth";

type EmployeeAnalyticsPageProps = {
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

function submissionLabel(
  reviewedSubmissions: number,
  submissionAcceptanceRate: number,
) {
  if (!reviewedSubmissions) {
    return "No reviewed submissions yet";
  }

  return `${submissionAcceptanceRate}% accepted by review`;
}

export default async function EmployeeAnalyticsPage({
  searchParams,
}: EmployeeAnalyticsPageProps) {
  const profile = await requireEmployeeProfile();
  const params = await searchParams;
  const analytics = await getEmployeeAnalytics(profile.companyId!, profile.id);
  const reportMap = await getProfileAnalysisReports(profile.companyId!, [profile.id]);
  const baselineReport = reportMap.get(profile.id) ?? null;
  const liveInsight = analytics
    ? buildLiveEmployeeInsight({
        analytics,
        baselineReport,
      })
    : null;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[32px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Employee Analytics</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              Personal delivery, attendance, and work-quality intelligence.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              This view tracks your working time, attendance consistency, project load,
              task movement, and submission review quality inside SmartDesk.
            </p>
            <div className="mt-6">
              <StatusBanner error={params.error} success={params.success} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] xl:min-w-[320px]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Current Score
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-slate-950">
              {analytics?.performanceScore ?? 0}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {analytics?.headline ?? "Analytics data will appear once tracked records are available."}
            </p>
          </div>
        </div>
      </section>

      {!analytics ? (
        <section className="panel-strong rounded-[30px] p-6">
          <p className="text-sm leading-7 text-slate-600">
            Analytics will appear here after attendance, working sessions, tasks, and submissions
            are tracked for your profile.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Attendance"
              value={`${analytics.attendanceRate}%`}
              hint={`${analytics.presentDays}/${analytics.totalAttendanceDays} tracked days present`}
            />
            <MetricCard
              label="Working Time"
              value={`${analytics.avgHoursPerDay}h`}
              hint={`${analytics.totalHours} total hours logged`}
            />
            <MetricCard
              label="Task Delivery"
              value={`${analytics.completedTasks}/${analytics.totalTasks}`}
              hint={`${analytics.overdueTasks} overdue assignments`}
            />
            <MetricCard
              label="Review Quality"
              value={analytics.reviewedSubmissions ? `${analytics.submissionAcceptanceRate}%` : "NA"}
              hint={submissionLabel(analytics.reviewedSubmissions, analytics.submissionAcceptanceRate)}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <AnalyticsProgress
              label="Attendance Discipline"
              value={analytics.attendanceRate}
              subtitle={`${analytics.lateDays} late day(s), ${analytics.leaveDays} leave day(s), punctuality score ${analytics.punctualityScore}`}
              colorClass="from-emerald-500 to-green-600"
            />
            <AnalyticsProgress
              label="Focus & Activity"
              value={Math.round((analytics.focusScore + analytics.activityScore) / 2)}
              subtitle={`Focus score ${analytics.focusScore}, activity score ${analytics.activityScore}`}
              colorClass="from-cyan-500 to-sky-600"
            />
            <AnalyticsProgress
              label="Submission Acceptance"
              value={analytics.reviewedSubmissions ? analytics.submissionAcceptanceRate : 0}
              subtitle={`${analytics.acceptedSubmissions} accepted, ${analytics.needsChangesSubmissions} needs changes, ${analytics.rejectedSubmissions} rejected`}
              colorClass="from-amber-500 to-orange-600"
            />
            <AnalyticsProgress
              label="Collaboration Signal"
              value={Math.min(100, analytics.collaborationCount * 9)}
              subtitle={`${analytics.collaborationCount} collaboration event(s) from chat and meetings`}
              colorClass="from-violet-500 to-indigo-600"
            />
          </section>

          {liveInsight ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="panel-strong rounded-[30px] p-6">
                <h3 className="section-title">Current Analysis Recommendation</h3>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {liveInsight.label} ({liveInsight.score})
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-600">{liveInsight.summary}</p>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {liveInsight.recommendation}
                </p>
                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  {liveInsight.actions.map((action) => (
                    <p key={action}>- {action}</p>
                  ))}
                </div>
              </article>

              <article className="panel-strong rounded-[30px] p-6">
                <h3 className="section-title">Hiring Baseline</h3>
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
                    No hiring baseline report is linked to this profile yet. Live analytics are still
                    active and will keep updating.
                  </p>
                )}
              </article>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="panel-strong rounded-[30px] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="section-title">Attendance Timeline</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Recent check-in patterns and daily tracked hours.
                  </p>
                </div>
                <Link className="button-secondary" href="/dashboard/employee/tasks">
                  Open Tasks
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {analytics.recentAttendance.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{formatDate(day.date)}</p>
                        <p className="mt-1 text-sm text-slate-500 capitalize">
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
              <p className="mt-2 text-sm text-slate-600">
                Active memberships, client context, and role alignment.
              </p>
              <div className="mt-5 space-y-3">
                {analytics.projectMemberships.length === 0 ? (
                  <p className="text-sm leading-7 text-slate-500">
                    No project memberships are mapped yet.
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
              <h3 className="section-title">Recent Work Sessions</h3>
              <p className="mt-2 text-sm text-slate-600">
                Focus, activity, and productive time captured by the tracking system.
              </p>
              <div className="mt-5 space-y-3">
                {analytics.recentSessions.length === 0 ? (
                  <p className="text-sm leading-7 text-slate-500">
                    No tracked work sessions yet.
                  </p>
                ) : (
                  analytics.recentSessions.map((session) => (
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
                  ))
                )}
              </div>
            </article>

            <article className="panel-strong rounded-[30px] p-6">
              <h3 className="section-title">Submission Reviews</h3>
              <p className="mt-2 text-sm text-slate-600">
                Approval quality, review feedback, and pending work handoffs.
              </p>
              <div className="mt-5 space-y-3">
                {analytics.recentSubmissions.length === 0 ? (
                  <p className="text-sm leading-7 text-slate-500">
                    No submissions have been tracked yet.
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
        </>
      )}
    </div>
  );
}
