import { redirect } from "next/navigation";

import { AnalyticsProgress } from "@/components/analytics-progress";
import { EmployeeAnalyticsCard } from "@/components/employee-analytics-card";
import { MetricCard } from "@/components/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { reviewTaskSubmissionAction } from "@/app/dashboard/company-admin/actions";
import { requireProfile } from "@/lib/auth";
import {
  buildLiveEmployeeInsight,
  getProfileAnalysisReports,
} from "@/lib/employee-analysis-reports";
import { getCompanyAnalyticsBundle } from "@/lib/employee-analytics";

type AnalyticsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const analytics = profile.companyId
    ? await getCompanyAnalyticsBundle(profile.companyId)
    : null;
  const profileReports = profile.companyId && analytics
    ? await getProfileAnalysisReports(
        profile.companyId,
        analytics.employees.map((employee) => employee.profile.id),
      )
    : new Map();
  const topPerformersWithInsight = analytics
    ? analytics.overview.topPerformers.map((employee) => ({
        employee,
        insight: buildLiveEmployeeInsight({
          analytics: employee,
          baselineReport: profileReports.get(employee.profile.id) ?? null,
        }),
      }))
    : [];
  const attentionNeededWithInsight = analytics
    ? analytics.overview.attentionNeeded.map((employee) => ({
        employee,
        insight: buildLiveEmployeeInsight({
          analytics: employee,
          baselineReport: profileReports.get(employee.profile.id) ?? null,
        }),
      }))
    : [];

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow">Employee Analytics Hub</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
              Live workforce analysis across attendance, working time, delivery, and review quality.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Use this view to track each employee’s operational health, submission acceptance,
              overdue delivery risk, and day-to-day performance consistency.
            </p>
            <div className="mt-6">
              <StatusBanner error={params.error} success={params.success} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] xl:min-w-[320px]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Company Health Score
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-slate-950">
              {analytics?.overview.avgPerformanceScore ?? 0}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Average employee performance score from attendance, delivery throughput, review
              outcomes, and tracked work quality.
            </p>
          </div>
        </div>

        {!profile.companyId ? (
          <p className="mt-6 text-sm leading-7 text-amber-700">
            Assign a company to this admin profile before reviewing employee analytics.
          </p>
        ) : null}
      </section>

      {analytics ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Employees"
              value={String(analytics.overview.employeeCount)}
              hint="Tracked employee records"
            />
            <MetricCard
              label="Attendance"
              value={`${analytics.overview.avgAttendanceRate}%`}
              hint="Average company attendance"
            />
            <MetricCard
              label="Avg Hours"
              value={`${analytics.overview.avgHoursPerDay}h`}
              hint="Average daily working time"
            />
            <MetricCard
              label="Pending Reviews"
              value={String(analytics.overview.totalPendingReviews)}
              hint={`${analytics.overview.totalOverdueTasks} overdue task(s)`}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <AnalyticsProgress
              label="Attendance Consistency"
              value={analytics.overview.avgAttendanceRate}
              subtitle="Average presence rate across tracked employees"
              colorClass="from-emerald-500 to-green-600"
            />
            <AnalyticsProgress
              label="Submission Acceptance"
              value={analytics.overview.avgAcceptanceRate}
              subtitle="Average reviewed-submission approval rate"
              colorClass="from-amber-500 to-orange-600"
            />
            <AnalyticsProgress
              label="Operational Score"
              value={analytics.overview.avgPerformanceScore}
              subtitle={`${analytics.overview.activeProjectCount} active project membership(s) being tracked`}
              colorClass="from-sky-500 to-cyan-600"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="panel-strong rounded-[30px] p-6">
              <h3 className="section-title">Top Performers</h3>
              <div className="mt-5 space-y-3">
                {topPerformersWithInsight.map(({ employee, insight }) => (
                  <div
                    key={employee.profile.id}
                    className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{employee.profile.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {employee.profile.department ?? "General"} | {employee.profile.email}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Score {employee.performanceScore}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{employee.headline}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-strong rounded-[30px] p-6">
              <h3 className="section-title">Attention Needed</h3>
              <div className="mt-5 space-y-3">
                {analytics.overview.attentionNeeded.length === 0 ? (
                  <p className="text-sm leading-7 text-slate-500">
                    No employees are currently flagged for immediate attention.
                  </p>
                ) : (
                  attentionNeededWithInsight.map(({ employee, insight }) => (
                    <div
                      key={employee.profile.id}
                      className="rounded-[22px] border border-slate-200/70 bg-white/85 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{employee.profile.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Attendance {employee.attendanceRate}% | Overdue {employee.overdueTasks} |
                            Pending review {employee.pendingReviewSubmissions}
                          </p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                          Score {employee.performanceScore}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{employee.headline}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {insight.recommendation}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="panel rounded-[30px] p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="section-title">Submission Review Queue</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Approve, request changes, or reject employee deliverables from one place.
                </p>
              </div>
              <p className="rounded-full border border-slate-200 bg-white/75 px-4 py-2 text-sm text-slate-600">
                {analytics.reviewQueue.length} submission(s) awaiting review
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {analytics.reviewQueue.length === 0 ? (
                <p className="text-sm leading-7 text-slate-500">
                  No submissions are waiting for review right now.
                </p>
              ) : (
                analytics.reviewQueue.map((submission) => (
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
                          {submission.employeeName} | {submission.employeeEmail}
                        </p>
                        <p className="text-sm text-slate-500">
                          Priority {submission.taskPriority} | Task {submission.taskStatus.replace("_", " ")} |
                          Due {submission.dueDate ?? "Open"}
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
                          value="/dashboard/company-admin/analytics"
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

          <section className="space-y-4">
            {analytics.employees.map((employee) => (
              <EmployeeAnalyticsCard
                key={employee.profile.id}
                employee={employee}
                href={`/dashboard/company-admin/analytics/${employee.profile.id}`}
                insight={buildLiveEmployeeInsight({
                  analytics: employee,
                  baselineReport: profileReports.get(employee.profile.id) ?? null,
                })}
              />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
