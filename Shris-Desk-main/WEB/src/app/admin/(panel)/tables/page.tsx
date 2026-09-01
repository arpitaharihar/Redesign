"use client";

import { useEffect, useState } from "react";

import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { ResumeModal } from "@/components/resume-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type Application = {
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
};

export default function AdminTablesPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [hired, setHired] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadApplications = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("job_applications")
      .select(
        "id, full_name, email, phone, desired_role, status, ats_score, resume_link, cover_letter, opening_id, job_openings(title)",
      )
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    const apps = (data ?? []) as Application[];
    setApplications(apps);
    setHired(apps.filter((app) => app.status === "hired"));
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) {
      loadApplications();
    }
  }, [profile?.company_id]);

  const updateStatus = async (applicationId: string, status: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("job_applications").update({ status }).eq("id", applicationId);
    await loadApplications();
  };

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading applicants...</div>;
  }

  const filtered = applications.filter((app) => {
    const haystack = `${app.full_name} ${app.email} ${app.desired_role}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const statusBadge = (status: string) => {
    if (status === "hired") return "bg-success";
    if (status === "rejected" || status === "ats_rejected") return "bg-danger";
    if (status === "shortlisted") return "bg-info";
    return "bg-warning";
  };

  const isDecisionPending = (status: string) =>
    !["hired", "rejected"].includes(status);

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Tables" breadcrumb="Tables" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex flex-column flex-lg-row justify-content-between">
            <div>
              <h3 className="mb-2">Applicant Dashboard</h3>
              <p className="mb-0 text-white-50">
                Review applicants, update their status, and track hired employees.
              </p>
            </div>
            <div className="mt-3 mt-lg-0">
              <input
                className="form-control form-control-sm"
                placeholder="Search applicants..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="sd-card-header">
            <h6 className="text-white text-capitalize mb-0">Applicant Dashboard</h6>
          </div>
          <div className="card-body px-0 pt-0 pb-2">
            <div className="table-responsive p-0">
              <table className="table align-items-center mb-0 sd-table">
                <thead>
                  <tr>
                    <th className="text-secondary opacity-7">Candidate</th>
                    <th className="text-secondary opacity-7">Role</th>
                    <th className="text-secondary opacity-7">ATS Score</th>
                    <th className="text-secondary opacity-7">Status</th>
                    <th className="text-secondary opacity-7">Resume</th>
                    <th className="text-secondary opacity-7">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <div className="d-flex px-3 py-1">
                          <div className="d-flex flex-column justify-content-center">
                            <h6 className="mb-0 text-sm">{application.full_name}</h6>
                            <p className="text-xs text-secondary mb-0">{application.email}</p>
                            <p className="text-xs text-secondary mb-0">{application.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="align-middle text-sm">
                        {Array.isArray(application.job_openings)
                          ? application.job_openings[0]?.title ?? application.desired_role
                          : application.job_openings?.title ?? application.desired_role}
                      </td>
                      <td className="align-middle text-sm">{application.ats_score}</td>
                      <td className="align-middle text-sm">
                        <span className={`badge ${statusBadge(application.status)} sd-badge`}>
                          {application.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="align-middle text-sm">
                        <ResumeModal url={application.resume_link} />
                      </td>
                      <td className="align-middle text-sm">
                        {isDecisionPending(application.status) ? (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => updateStatus(application.id, "hired")}
                            >
                              Hire
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => updateStatus(application.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-outline-secondary btn-sm" disabled>
                            Decision Made
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No applicants yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card mt-4">
          <div className="sd-card-header">
            <h6 className="text-white text-capitalize mb-0">Hired Employees</h6>
          </div>
          <div className="card-body px-0 pt-0 pb-2">
            <div className="table-responsive p-0">
              <table className="table align-items-center mb-0 sd-table">
                <thead>
                  <tr>
                    <th className="text-secondary opacity-7">Candidate</th>
                    <th className="text-secondary opacity-7">Role</th>
                    <th className="text-secondary opacity-7">Resume</th>
                    <th className="text-secondary opacity-7">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hired.map((application) => (
                    <tr key={application.id}>
                      <td className="align-middle text-sm">
                        <div className="d-flex flex-column px-3">
                          <h6 className="mb-0 text-sm">{application.full_name}</h6>
                          <p className="text-xs text-secondary mb-0">{application.email}</p>
                        </div>
                      </td>
                      <td className="align-middle text-sm">{application.desired_role}</td>
                      <td className="align-middle text-sm">
                        <ResumeModal url={application.resume_link} />
                      </td>
                      <td className="align-middle text-sm">
                        <span className="badge bg-success sd-badge">Joining Letter Sent</span>
                      </td>
                    </tr>
                  ))}
                  {hired.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No hired employees yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {loading ? <div className="text-muted text-sm mt-3">Refreshing...</div> : null}
      </div>
    </main>
  );
}
