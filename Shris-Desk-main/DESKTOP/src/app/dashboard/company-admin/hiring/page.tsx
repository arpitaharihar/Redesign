import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { ResumeModal } from "@/components/resume-modal";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { getApplicationAnalysisReports } from "@/lib/employee-analysis-reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  backfillEmployeeAnalysisReportsAction,
  createJobOpeningAction,
  updateJobOpeningAction,
  updateApplicationStatusAction,
} from "../actions";

type HiringPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    status?: string;
    opening?: string;
  }>;
};

export default async function CompanyAdminHiringPage({
  searchParams,
}: HiringPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let openings: Array<{
    id: string;
    title: string;
    department: string | null;
    status: string;
    min_ats_score: number;
    ats_keywords: string | null;
    description: string | null;
    shortlist_email_subject: string | null;
    shortlist_email_body: string | null;
    hire_email_subject: string | null;
    hire_email_body: string | null;
    reject_email_subject: string | null;
    reject_email_body: string | null;
  }> = [];
  let applications: Array<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    desired_role: string;
    status: string;
    ats_score: number;
    ats_threshold_at_submission: number;
    resume_link: string;
    cover_letter: string | null;
    created_at: string;
    opening_id: string | null;
    job_openings?: { title?: string } | Array<{ title?: string }> | null;
  }> = [];
  let shortlisted: Array<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    desired_role: string;
    status: string;
    ats_score: number;
    resume_link: string;
    cover_letter: string | null;
    opening_id: string | null;
    job_openings?: { title?: string } | Array<{ title?: string }> | null;
  }> = [];
  let credentials: Array<{
    application_id: string;
    recipient_email: string;
    temp_password: string;
  }> = [];

  if (profile.companyId) {
    const applicationsQuery = supabase
      .from("job_applications")
      .select(
        "id, full_name, email, phone, desired_role, status, ats_score, ats_threshold_at_submission, resume_link, cover_letter, created_at, opening_id, job_openings(title)",
      )
      .eq("company_id", profile.companyId)
      .order("created_at", { ascending: false });

    if (params.status) {
      applicationsQuery.eq("status", params.status);
    }
    if (params.opening) {
      applicationsQuery.eq("opening_id", params.opening);
    }

    const [openingsResult, applicationsResult, shortlistedResult, credentialsResult] = await Promise.all([
      supabase
        .from("job_openings")
        .select("id, title, department, description, status, min_ats_score, ats_keywords, shortlist_email_subject, shortlist_email_body, hire_email_subject, hire_email_body, reject_email_subject, reject_email_body")
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false }),
      applicationsQuery,
      supabase
        .from("job_applications")
        .select(
          "id, full_name, email, phone, desired_role, status, ats_score, resume_link, cover_letter, opening_id, job_openings(title)",
        )
        .eq("company_id", profile.companyId)
        .eq("status", "shortlisted")
        .order("created_at", { ascending: false }),
      supabase
        .from("candidate_credentials")
        .select("application_id, recipient_email, temp_password")
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false }),
    ]);

    openings = (openingsResult.data ?? []) as Array<{
      id: string;
      title: string;
      department: string | null;
      status: string;
      min_ats_score: number;
      ats_keywords: string | null;
      description: string | null;
      shortlist_email_subject: string | null;
      shortlist_email_body: string | null;
      hire_email_subject: string | null;
      hire_email_body: string | null;
      reject_email_subject: string | null;
      reject_email_body: string | null;
    }>;
    applications = (applicationsResult.data ?? []) as Array<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      desired_role: string;
      status: string;
      ats_score: number;
      ats_threshold_at_submission: number;
      resume_link: string;
      cover_letter: string | null;
      created_at: string;
      opening_id: string | null;
      job_openings?: { title?: string } | Array<{ title?: string }> | null;
    }>;
    shortlisted = (shortlistedResult.data ?? []) as Array<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      desired_role: string;
      status: string;
      ats_score: number;
      resume_link: string;
      cover_letter: string | null;
      opening_id: string | null;
      job_openings?: { title?: string } | Array<{ title?: string }> | null;
    }>;
    credentials = (credentialsResult.data ?? []) as Array<{
      application_id: string;
      recipient_email: string;
      temp_password: string;
    }>;
  }

  const statusFilter = params.status ?? "";
  const openingFilter = params.opening ?? "";
  const statusCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalApplications = applications.length;
  const shortlistedCount = statusCounts.shortlisted ?? 0;
  const hiredCount = statusCounts.hired ?? 0;
  const rejectedCount = statusCounts.rejected ?? 0;
  const avgAts =
    totalApplications > 0
      ? (
          applications.reduce((sum, application) => sum + Number(application.ats_score ?? 0), 0) /
          totalApplications
        ).toFixed(1)
      : "0.0";
  const analysisReportIds = Array.from(
    new Set([
      ...applications.map((application) => application.id),
      ...shortlisted.map((candidate) => candidate.id),
    ]),
  );
  const analysisReports = profile.companyId
    ? await getApplicationAnalysisReports(
        profile.companyId,
        analysisReportIds,
      )
    : new Map();

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Hiring</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Publish openings and review candidate applications.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={backfillEmployeeAnalysisReportsAction}>
            <input type="hidden" name="redirectTo" value="/dashboard/company-admin/hiring" />
            <button className="button-secondary" type="submit" disabled={!profile.companyId}>
              Backfill Existing Hired Reports
            </button>
          </form>
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Assign a company to this admin profile before publishing openings.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard
          label="Applications"
          value={String(totalApplications)}
          hint="Total applicants"
        />
        <MetricCard
          label="Shortlisted"
          value={String(shortlistedCount)}
          hint="Ready for review"
        />
        <MetricCard
          label="Hired"
          value={String(hiredCount)}
          hint="Joined hires"
        />
        <MetricCard
          label="Rejected"
          value={String(rejectedCount)}
          hint="Closed applications"
        />
        <MetricCard
          label="Avg ATS"
          value={`${avgAts}%`}
          hint="ATS score average"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Submitted", key: "submitted" },
          { label: "ATS Reviewed", key: "ats_reviewed" },
          { label: "Admin Review", key: "admin_review" },
          { label: "Shortlisted", key: "shortlisted" },
          { label: "Rejected", key: "rejected" },
        ].map((stage) => (
          <div key={stage.key} className="panel-strong rounded-[24px] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{stage.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">
              {statusCounts[stage.key] ?? 0}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Job Openings</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">ATS Threshold</th>
                  <th className="pb-3 pr-4">ATS Keywords</th>
                  <th className="pb-3 pr-4">Edit</th>
                </tr>
              </thead>
              <tbody>
                {openings.map((opening) => (
                  <tr key={opening.id} className="border-t border-slate-200/70 align-top">
                    <td className="py-3 pr-4 font-medium">{opening.title}</td>
                    <td className="py-3 pr-4">{opening.department ?? "General"}</td>
                    <td className="py-3 pr-4 capitalize">{opening.status}</td>
                    <td className="py-3 pr-4">{opening.min_ats_score}%</td>
                    <td className="py-3 pr-4">{opening.ats_keywords ?? "Not set"}</td>
                    <td className="py-3 pr-4">
                      <details className="min-w-[380px] rounded-[18px] border border-slate-200 bg-white p-3">
                        <summary className="cursor-pointer font-semibold text-slate-700">Edit</summary>
                        <form action={updateJobOpeningAction} className="mt-4 space-y-3">
                          <input type="hidden" name="openingId" value={opening.id} />
                          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/hiring" />
                          <input className="input-base" name="title" defaultValue={opening.title} required />
                          <input className="input-base" name="department" defaultValue={opening.department ?? ""} />
                          <textarea className="input-base min-h-24" name="description" defaultValue={opening.description ?? ""} required />
                          <textarea className="input-base min-h-20" name="atsKeywords" defaultValue={opening.ats_keywords ?? ""} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input className="input-base" type="number" min="0" max="100" name="minAtsScore" defaultValue={opening.min_ats_score} required />
                            <select className="input-base" name="status" defaultValue={opening.status}>
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                          <details className="rounded-[18px] border border-slate-200 px-3 py-3">
                            <summary className="cursor-pointer font-semibold text-slate-700">Email templates</summary>
                            <div className="mt-3 space-y-3">
                              <input className="input-base" name="shortlistSubject" defaultValue={opening.shortlist_email_subject ?? ""} placeholder="Shortlist subject" />
                              <textarea className="input-base min-h-20" name="shortlistBody" defaultValue={opening.shortlist_email_body ?? ""} placeholder="Shortlist body" />
                              <input className="input-base" name="hireSubject" defaultValue={opening.hire_email_subject ?? ""} placeholder="Hire subject" />
                              <textarea className="input-base min-h-20" name="hireBody" defaultValue={opening.hire_email_body ?? ""} placeholder="Hire body" />
                              <input className="input-base" name="rejectSubject" defaultValue={opening.reject_email_subject ?? ""} placeholder="Reject subject" />
                              <textarea className="input-base min-h-20" name="rejectBody" defaultValue={opening.reject_email_body ?? ""} placeholder="Reject body" />
                            </div>
                          </details>
                          <button className="button-primary w-full" type="submit">
                            Update Opening
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

        <form action={createJobOpeningAction} className="panel-strong rounded-[30px] p-6">
          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/hiring" />
          <h3 className="section-title">Create Job Opening</h3>
          <div className="mt-5 space-y-4">
            <input
              className="input-base"
              name="title"
              placeholder="Opening title"
              disabled={!profile.companyId}
            />
            <input
              className="input-base"
              name="department"
              placeholder="Department"
              disabled={!profile.companyId}
            />
            <textarea
              className="input-base min-h-28"
              name="description"
              placeholder="Opening description"
              disabled={!profile.companyId}
            />
            <textarea
              className="input-base min-h-24"
              name="atsKeywords"
              placeholder="ATS keywords (comma-separated)"
              disabled={!profile.companyId}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="input-base"
                type="number"
                min="0"
                max="100"
                name="minAtsScore"
                defaultValue="60"
                placeholder="Minimum ATS score"
                disabled={!profile.companyId}
              />
              <select
                className="input-base"
                name="status"
                defaultValue="draft"
                disabled={!profile.companyId}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <details className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Custom Email Templates (Shortlist / Hire / Reject)
              </summary>
              <div className="mt-4 space-y-4">
                <input
                  className="input-base"
                  name="shortlistSubject"
                  placeholder="Shortlist email subject"
                  disabled={!profile.companyId}
                />
                <textarea
                  className="input-base min-h-24"
                  name="shortlistBody"
                  placeholder="Shortlist email body"
                  disabled={!profile.companyId}
                />
                <input
                  className="input-base"
                  name="hireSubject"
                  placeholder="Hire email subject"
                  disabled={!profile.companyId}
                />
                <textarea
                  className="input-base min-h-24"
                  name="hireBody"
                  placeholder="Hire email body"
                  disabled={!profile.companyId}
                />
                <input
                  className="input-base"
                  name="rejectSubject"
                  placeholder="Reject email subject"
                  disabled={!profile.companyId}
                />
                <textarea
                  className="input-base min-h-24"
                  name="rejectBody"
                  placeholder="Reject email body"
                  disabled={!profile.companyId}
                />
              </div>
            </details>
            <button
              className="button-primary w-full"
              type="submit"
              disabled={!profile.companyId}
            >
              Save Opening
            </button>
          </div>
        </form>
      </section>

      <section className="panel rounded-[30px] p-6">
        <h3 className="section-title">Shortlisted Candidates</h3>
        <div className="mt-5 overflow-x-auto">
          {shortlisted.length === 0 ? (
            <p className="text-sm leading-7 text-slate-500">No shortlisted candidates yet.</p>
          ) : null}
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Candidate</th>
                <th className="pb-3 pr-4">Opening</th>
                <th className="pb-3 pr-4">ATS Score</th>
                <th className="pb-3 pr-4">Initial Analysis</th>
                <th className="pb-3 pr-4">Resume</th>
                <th className="pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shortlisted.map((candidate) => {
                const report = analysisReports.get(candidate.id);

                return (
                  <tr key={candidate.id} className="border-t border-slate-200/70 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{candidate.full_name}</div>
                      <div className="text-xs text-slate-500">{candidate.email}</div>
                      <div className="text-xs text-slate-500">{candidate.phone}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {Array.isArray(candidate.job_openings)
                        ? candidate.job_openings[0]?.title ?? candidate.desired_role
                        : candidate.job_openings?.title ?? candidate.desired_role}
                    </td>
                    <td className="py-3 pr-4">{candidate.ats_score}</td>
                    <td className="py-3 pr-4">
                      {report ? (
                        <div className="max-w-xs space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {report.recommendationLevel}
                          </p>
                          <p className="text-sm leading-6 text-slate-700">{report.summary}</p>
                        </div>
                      ) : (
                        <p className="max-w-xs text-sm leading-6 text-slate-500">
                          Analysis report will appear after ATS or status update runs.
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <ResumeModal url={candidate.resume_link} />
                    </td>
                    <td className="py-3 pr-4">
                      <form action={updateApplicationStatusAction} className="space-y-2">
                        <input type="hidden" name="applicationId" value={candidate.id} />
                        <input type="hidden" name="openingId" value={candidate.opening_id ?? ""} />
                        <input type="hidden" name="candidateEmail" value={candidate.email} />
                        <input type="hidden" name="candidateName" value={candidate.full_name} />
                        <input type="hidden" name="redirectTo" value="/dashboard/company-admin/hiring" />
                        <select className="input-base" name="status" defaultValue="shortlisted">
                          <option value="shortlisted">Shortlisted</option>
                          <option value="approved">Approved</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button className="button-secondary w-full" type="submit">
                          Update
                        </button>
                      </form>
                      {credentials.find(
                        (credential) => credential.application_id === candidate.id,
                      ) ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Credentials generated and queued for email.
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel rounded-[30px] p-6">
        <h3 className="section-title">Recent Applications</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Emails are sent immediately when you shortlist, hire, or reject (SMTP required).
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <form className="flex flex-wrap gap-3">
            <select className="input-base" name="status" defaultValue={statusFilter}>
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="ats_reviewed">ATS Reviewed</option>
              <option value="ats_rejected">ATS Rejected</option>
              <option value="admin_review">Admin Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="approved">Approved</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="input-base" name="opening" defaultValue={openingFilter}>
              <option value="">All openings</option>
              {openings.map((opening) => (
                <option key={opening.id} value={opening.id}>
                  {opening.title}
                </option>
              ))}
            </select>
            <button className="button-secondary" type="submit">
              Apply Filters
            </button>
          </form>
        </div>
        <div className="mt-5 overflow-x-auto">
          {applications.length === 0 ? (
            <p className="text-sm leading-7 text-slate-500">
              No applications found for the selected filters.
            </p>
          ) : null}
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Candidate</th>
                <th className="pb-3 pr-4">Opening</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">ATS Score</th>
                <th className="pb-3 pr-4">Initial Analysis</th>
                <th className="pb-3 pr-4">Resume</th>
                <th className="pb-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => {
                const report = analysisReports.get(application.id);

                return (
                  <tr key={application.id} className="border-t border-slate-200/70 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{application.full_name}</div>
                      <div className="text-xs text-slate-500">{application.email}</div>
                      <div className="text-xs text-slate-500">{application.phone}</div>
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer">View cover letter</summary>
                        <p className="mt-2 whitespace-pre-wrap text-slate-600">
                          {application.cover_letter ?? "No cover letter provided."}
                        </p>
                      </details>
                    </td>
                    <td className="py-3 pr-4">
                      {Array.isArray(application.job_openings)
                        ? application.job_openings[0]?.title ?? application.desired_role
                        : application.job_openings?.title ?? application.desired_role}
                    </td>
                    <td className="py-3 pr-4 capitalize">{application.status.replace("_", " ")}</td>
                    <td className="py-3 pr-4">
                      {application.ats_score} / {application.ats_threshold_at_submission}
                    </td>
                    <td className="py-3 pr-4">
                      {report ? (
                        <div className="max-w-xs space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {report.recommendationLevel}
                          </p>
                          <p className="text-sm leading-6 text-slate-700">{report.summary}</p>
                        </div>
                      ) : (
                        <p className="max-w-xs text-sm leading-6 text-slate-500">
                          Analysis report will appear after ATS or status update runs.
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <ResumeModal url={application.resume_link} />
                    </td>
                    <td className="py-3 pr-4">
                      <form action={updateApplicationStatusAction} className="space-y-2">
                        <input type="hidden" name="applicationId" value={application.id} />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={`/dashboard/company-admin/hiring?status=${statusFilter}&opening=${openingFilter}`}
                        />
                        <select className="input-base" name="status" defaultValue={application.status}>
                          <option value="submitted">Submitted</option>
                          <option value="ats_reviewed">ATS Reviewed</option>
                          <option value="ats_rejected">ATS Rejected</option>
                          <option value="admin_review">Admin Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="approved">Approved</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button className="button-secondary w-full" type="submit">
                          Update
                        </button>
                      </form>
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
