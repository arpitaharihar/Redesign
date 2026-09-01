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
  resume_link: string;
  hired_at: string | null;
};

export default function AdminHiredPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    const loadHired = async () => {
      if (!profile?.company_id) return;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("job_applications")
        .select("id, full_name, email, phone, desired_role, resume_link, hired_at")
        .eq("company_id", profile.company_id)
        .eq("status", "hired")
        .order("hired_at", { ascending: false });
      setApplications((data ?? []) as Application[]);
    };

    if (profile?.company_id) {
      loadHired();
    }
  }, [profile?.company_id]);

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading hires...</div>;
  }

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Hired Employees" breadcrumb="Hired" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h3 className="mb-2">Hired Employees</h3>
              <p className="mb-0 text-white-50">Track all employees marked as hired.</p>
            </div>
            <span className="badge bg-light text-dark">{applications.length} total</span>
          </div>
        </div>
        <div className="card">
          <div className="sd-card-header">
            <h6 className="text-white text-capitalize mb-0">Hired Candidates</h6>
          </div>
          <div className="card-body px-0 pt-0 pb-2">
            <div className="table-responsive p-0">
              <table className="table align-items-center mb-0 sd-table">
                <thead>
                  <tr>
                    <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                      Candidate
                    </th>
                    <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                      Role
                    </th>
                    <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                      Hired Date
                    </th>
                    <th className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7">
                      Resume
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
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
                      <td className="align-middle text-sm">{application.desired_role}</td>
                      <td className="align-middle text-sm">
                        {application.hired_at
                          ? new Date(application.hired_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="align-middle text-sm">
                        <ResumeModal url={application.resume_link} />
                      </td>
                    </tr>
                  ))}
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted py-4">
                        No hires yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
