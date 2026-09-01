"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminBody } from "@/components/admin-body";
import { AdminPanelSidebar } from "@/components/admin-panel-sidebar";
import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { ResumeModal } from "@/components/resume-modal";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type Opening = {
  id: string;
  title: string;
  department: string | null;
  status: string;
  min_ats_score: number;
  ats_keywords: string | null;
};

type Application = {
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
  opening_id: string | null;
  job_openings?: { title?: string } | Array<{ title?: string }> | null;
};

export default function AdminHiringPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    status: "draft",
    minAtsScore: "60",
    atsKeywords: "",
  });

  const statusCounts = useMemo(() => {
    return applications.reduce<Record<string, number>>((acc, application) => {
      acc[application.status] = (acc[application.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [applications]);

  const loadData = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const [openingsResult, applicationsResult] = await Promise.all([
      supabase
        .from("job_openings")
        .select("id, title, department, status, min_ats_score, ats_keywords")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_applications")
        .select(
          "id, full_name, email, phone, desired_role, status, ats_score, ats_threshold_at_submission, resume_link, cover_letter, opening_id, job_openings(title)",
        )
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false }),
    ]);

    setOpenings((openingsResult.data ?? []) as Opening[]);
    setApplications((applicationsResult.data ?? []) as Application[]);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.company_id) {
      loadData();
    }
  }, [profile?.company_id]);

  const handleCreateOpening = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.company_id) return;
    setLoading(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("job_openings").insert({
      company_id: profile.company_id,
      title: form.title.trim(),
      department: form.department.trim() || null,
      status: form.status,
      min_ats_score: Number(form.minAtsScore),
      ats_keywords: form.atsKeywords.trim() || null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Opening created successfully.");
      setForm({
        title: "",
        department: "",
        status: "draft",
        minAtsScore: "60",
        atsKeywords: "",
      });
      await loadData();
    }
    setLoading(false);
  };

  const updateStatus = async (applicationId: string, status: string) => {
    const supabase = createSupabaseBrowserClient();
    const payload: Record<string, string | null> = { status };
    if (status === "shortlisted") payload.shortlisted_at = new Date().toISOString();
    if (status === "rejected") payload.rejected_at = new Date().toISOString();
    if (status === "hired") payload.hired_at = new Date().toISOString();
    await supabase.from("job_applications").update(payload).eq("id", applicationId);
    await loadData();
  };

  if (guardLoading) {
    return <div className="container py-5">Loading admin workspace...</div>;
  }

  return (
    <div className="admin-shell g-sidenav-show bg-gray-200">
      <AdminBody />
      <AdminPanelSidebar />
      <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
        <AdminPanelTopbar title="Hiring" breadcrumb="Hiring" />
        <div className="container-fluid py-4">
          <div className="sd-hero">
            <div className="d-flex flex-column flex-lg-row justify-content-between">
              <div>
                <h3 className="mb-2">Hiring Control Room</h3>
                <p className="mb-0 text-white-50">
                  Publish openings, shortlist candidates, and keep ATS scoring visible.
                </p>
              </div>
              <button className="btn btn-light btn-sm mt-3 mt-lg-0" onClick={loadData} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {message ? <div className="alert alert-info">{message}</div> : null}

          <div className="row g-4 mb-4">
            <div className="col-md-3">
              <div className="card">
                <div className="card-header p-3 pt-2">
                  <div className="icon icon-lg icon-shape bg-gradient-dark shadow-dark text-center border-radius-xl mt-n4 position-absolute">
                    <i className="material-icons opacity-10">summarize</i>
                  </div>
                  <div className="text-end pt-1">
                    <p className="text-sm mb-0 text-capitalize">Applications</p>
                    <h4 className="mb-0">{applications.length}</h4>
                  </div>
                </div>
                <hr className="dark horizontal my-0" />
                <div className="card-footer p-3">
                  <p className="mb-0">
                    <span className="text-success text-sm font-weight-bolder">+4%</span> from
                    last week
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-header p-3 pt-2">
                  <div className="icon icon-lg icon-shape bg-gradient-primary shadow-primary text-center border-radius-xl mt-n4 position-absolute">
                    <i className="material-icons opacity-10">person</i>
                  </div>
                  <div className="text-end pt-1">
                    <p className="text-sm mb-0 text-capitalize">Shortlisted</p>
                    <h4 className="mb-0">{statusCounts.shortlisted ?? 0}</h4>
                  </div>
                </div>
                <hr className="dark horizontal my-0" />
                <div className="card-footer p-3">
                  <p className="mb-0">
                    <span className="text-success text-sm font-weight-bolder">+2%</span> this
                    week
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-header p-3 pt-2">
                  <div className="icon icon-lg icon-shape bg-gradient-success shadow-success text-center border-radius-xl mt-n4 position-absolute">
                    <i className="material-icons opacity-10">badge</i>
                  </div>
                  <div className="text-end pt-1">
                    <p className="text-sm mb-0 text-capitalize">Hired</p>
                    <h4 className="mb-0">{statusCounts.hired ?? 0}</h4>
                  </div>
                </div>
                <hr className="dark horizontal my-0" />
                <div className="card-footer p-3">
                  <p className="mb-0">
                    <span className="text-success text-sm font-weight-bolder">+3%</span> total
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card">
                <div className="card-header p-3 pt-2">
                  <div className="icon icon-lg icon-shape bg-gradient-info shadow-info text-center border-radius-xl mt-n4 position-absolute">
                    <i className="material-icons opacity-10">gpp_bad</i>
                  </div>
                  <div className="text-end pt-1">
                    <p className="text-sm mb-0 text-capitalize">Rejected</p>
                    <h4 className="mb-0">{statusCounts.rejected ?? 0}</h4>
                  </div>
                </div>
                <hr className="dark horizontal my-0" />
                <div className="card-footer p-3">
                  <p className="mb-0">
                    <span className="text-danger text-sm font-weight-bolder">-1%</span> today
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card mb-4">
                <div className="sd-card-header">
                  <h6 className="text-white text-capitalize mb-0">Job Openings</h6>
                </div>
                <div className="card-body px-0 pt-0 pb-2">
                  <div className="table-responsive p-0">
                    <table className="table table-sm align-middle mb-0 sd-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>ATS Threshold</th>
                          <th>Keywords</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openings.map((opening) => (
                          <tr key={opening.id}>
                            <td className="fw-semibold">{opening.title}</td>
                            <td>{opening.department ?? "General"}</td>
                            <td className="text-capitalize">{opening.status}</td>
                            <td>{opening.min_ats_score}%</td>
                            <td>{opening.ats_keywords ?? "Not set"}</td>
                          </tr>
                        ))}
                        {openings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-muted">
                              No openings yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="sd-card-header">
                  <h6 className="text-white text-capitalize mb-0">Recent Applications</h6>
                </div>
                <div className="card-body px-0 pt-0 pb-2">
                  <div className="table-responsive p-0">
                    <table className="table table-sm align-middle mb-0 sd-table">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Opening</th>
                          <th>Status</th>
                          <th>ATS</th>
                          <th>Resume</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((application) => (
                          <tr key={application.id}>
                            <td>
                              <div className="fw-semibold">{application.full_name}</div>
                              <div className="text-muted small">{application.email}</div>
                              <div className="text-muted small">{application.phone}</div>
                            </td>
                            <td>
                              {Array.isArray(application.job_openings)
                                ? application.job_openings[0]?.title ?? application.desired_role
                                : application.job_openings?.title ?? application.desired_role}
                            </td>
                            <td className="text-capitalize">
                              {application.status.replace("_", " ")}
                            </td>
                            <td>
                              {application.ats_score} /{" "}
                              {application.ats_threshold_at_submission}
                            </td>
                            <td>
                              <ResumeModal url={application.resume_link} />
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm mb-2"
                                defaultValue={application.status}
                                onChange={(event) =>
                                  updateStatus(application.id, event.target.value)
                                }
                              >
                                <option value="submitted">Submitted</option>
                                <option value="ats_reviewed">ATS Reviewed</option>
                                <option value="ats_rejected">ATS Rejected</option>
                                <option value="admin_review">Admin Review</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="approved">Approved</option>
                                <option value="hired">Hired</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              {application.cover_letter ? (
                                <details>
                                  <summary className="small">Cover letter</summary>
                                  <p className="small text-muted mt-2">
                                    {application.cover_letter}
                                  </p>
                                </details>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                        {applications.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-muted">
                              No applications yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card">
                <div className="sd-card-header">
                  <h6 className="text-white text-capitalize mb-0">Create Job Opening</h6>
                </div>
                <div className="card-body">
                  <form onSubmit={handleCreateOpening} className="d-grid gap-3">
                    <input
                      className="form-control"
                      placeholder="Role title"
                      value={form.title}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                      required
                    />
                    <input
                      className="form-control"
                      placeholder="Department"
                      value={form.department}
                      onChange={(event) =>
                        setForm({ ...form, department: event.target.value })
                      }
                    />
                    <textarea
                      className="form-control"
                      placeholder="ATS keywords (comma-separated)"
                      value={form.atsKeywords}
                      onChange={(event) =>
                        setForm({ ...form, atsKeywords: event.target.value })
                      }
                    />
                    <div className="row g-2">
                      <div className="col-md-6">
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          max="100"
                          value={form.minAtsScore}
                          onChange={(event) =>
                            setForm({ ...form, minAtsScore: event.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <select
                          className="form-select"
                          value={form.status}
                          onChange={(event) =>
                            setForm({ ...form, status: event.target.value })
                          }
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Opening"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
