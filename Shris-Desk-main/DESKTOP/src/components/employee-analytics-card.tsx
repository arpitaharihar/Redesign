import Link from "next/link";

import type { EmployeeAnalysisInsight } from "@/lib/employee-analysis-reports";
import type { EmployeeAnalyticsSummary } from "@/lib/employee-analytics";

type EmployeeAnalyticsCardProps = {
  employee: EmployeeAnalyticsSummary;
  href: string;
  insight?: EmployeeAnalysisInsight | null;
};

function scoreTone(score: number) {
  if (score >= 85) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (score >= 70) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export function EmployeeAnalyticsCard({
  employee,
  href,
  insight,
}: EmployeeAnalyticsCardProps) {
  return (
    <article className="panel-strong rounded-[28px] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
              {employee.profile.name}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${scoreTone(
                employee.performanceScore,
              )}`}
            >
              Score {employee.performanceScore}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {employee.profile.department ?? "General"} | {employee.profile.email}
          </p>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">{employee.headline}</p>
          {insight ? (
            <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Admin Recommendation
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {insight.label} ({insight.score})
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{insight.recommendation}</p>
            </div>
          ) : null}
        </div>

        <Link className="button-secondary" href={href}>
          Open Analytics
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Attendance
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {employee.attendanceRate}%
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {employee.presentDays}/{employee.totalAttendanceDays} tracked days present
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Working Time
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {employee.avgHoursPerDay}h
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {employee.totalHours} total tracked hours
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Delivery
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {employee.completedTasks}/{employee.totalTasks}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {employee.overdueTasks} overdue | {employee.reviewTasks} in review
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Review Quality
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {employee.reviewedSubmissions ? `${employee.submissionAcceptanceRate}%` : "NA"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {employee.pendingReviewSubmissions} awaiting admin response
          </p>
        </div>
      </div>
    </article>
  );
}
