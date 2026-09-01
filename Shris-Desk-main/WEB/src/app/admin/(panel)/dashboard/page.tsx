"use client";

import { useEffect, useState } from "react";

import { AdminDashboardCharts } from "@/components/admin-dashboard-charts";
import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type Application = {
  id: string;
  status: string;
};

export default function AdminDashboardPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.company_id) return;
      setLoading(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("job_applications")
        .select("id, status")
        .eq("company_id", profile.company_id);
      setApplications((data ?? []) as Application[]);
      setLoading(false);
    };

    if (profile?.company_id) {
      loadData();
    }
  }, [profile?.company_id]);

  const hiredCount = applications.filter((app) => app.status === "hired").length;
  const rejectedCount = applications.filter((app) => app.status === "rejected").length;
  const pendingCount = applications.filter((app) =>
    ["submitted", "ats_reviewed", "admin_review", "shortlisted", "approved"].includes(
      app.status,
    ),
  ).length;

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading dashboard...</div>;
  }

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Dashboard" breadcrumb="Dashboard" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex flex-column flex-lg-row justify-content-between">
            <div>
              <h3 className="mb-2">Welcome back, Admin</h3>
              <p className="mb-0 text-white-50">
                Track applications, hiring momentum, and review status at a glance.
              </p>
            </div>
            <div className="mt-3 mt-lg-0 d-flex gap-2">
              <button className="btn btn-light btn-sm" onClick={() => window.location.href = "/admin/hiring"}>
                Go to Hiring
              </button>
              <button className="btn btn-outline-light btn-sm" onClick={() => window.location.href = "/admin/tables"}>
                View Applicants
              </button>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-xl-3 col-sm-6 mb-xl-0 mb-4">
            <div className="card">
              <div className="card-header p-3 pt-2">
                <div className="icon icon-lg icon-shape bg-gradient-dark shadow-dark text-center border-radius-xl mt-n4 position-absolute">
                  <i className="material-icons opacity-10">weekend</i>
                </div>
                <div className="text-end pt-1">
                  <p className="text-sm mb-0 text-capitalize">Applications</p>
                  <h4 className="mb-0">{applications.length}</h4>
                </div>
              </div>
              <hr className="dark horizontal my-0" />
              <div className="card-footer p-3">
                <p className="mb-0">
                  <span className="text-success text-sm font-weight-bolder">+4%</span> from last
                  week
                </p>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6 mb-xl-0 mb-4">
            <div className="card">
              <div className="card-header p-3 pt-2">
                <div className="icon icon-lg icon-shape bg-gradient-primary shadow-primary text-center border-radius-xl mt-n4 position-absolute">
                  <i className="material-icons opacity-10">person</i>
                </div>
                <div className="text-end pt-1">
                  <p className="text-sm mb-0 text-capitalize">Hired</p>
                  <h4 className="mb-0">{hiredCount}</h4>
                </div>
              </div>
              <hr className="dark horizontal my-0" />
              <div className="card-footer p-3">
                <p className="mb-0">
                  <span className="text-success text-sm font-weight-bolder">+2%</span> from last
                  month
                </p>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-sm-6 mb-xl-0 mb-4">
            <div className="card">
              <div className="card-header p-3 pt-2">
                <div className="icon icon-lg icon-shape bg-gradient-success shadow-success text-center border-radius-xl mt-n4 position-absolute">
                  <i className="material-icons opacity-10">person</i>
                </div>
                <div className="text-end pt-1">
                  <p className="text-sm mb-0 text-capitalize">In Review</p>
                  <h4 className="mb-0">{pendingCount}</h4>
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
          <div className="col-xl-3 col-sm-6">
            <div className="card">
              <div className="card-header p-3 pt-2">
                <div className="icon icon-lg icon-shape bg-gradient-info shadow-info text-center border-radius-xl mt-n4 position-absolute">
                  <i className="material-icons opacity-10">work</i>
                </div>
                <div className="text-end pt-1">
                  <p className="text-sm mb-0 text-capitalize">Rejected</p>
                  <h4 className="mb-0">{rejectedCount}</h4>
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
        </div>

        <div className="row mt-4">
          <div className="col-lg-4 col-md-6 mt-4 mb-4">
            <div className="card z-index-2 ">
              <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2 bg-transparent">
                <div className="bg-gradient-primary shadow-primary border-radius-lg py-3 pe-1">
                  <div className="chart">
                    <canvas id="chart-bars" className="chart-canvas" height="170" />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h6 className="mb-0 ">Weekly Applications</h6>
                <p className="text-sm ">Last 7 days trend</p>
                <hr className="dark horizontal" />
                <div className="d-flex ">
                  <i className="material-icons text-sm my-auto me-1">schedule</i>
                  <p className="mb-0 text-sm"> updated just now </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mt-4 mb-4">
            <div className="card z-index-2  ">
              <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2 bg-transparent">
                <div className="bg-gradient-success shadow-success border-radius-lg py-3 pe-1">
                  <div className="chart">
                    <canvas id="chart-line" className="chart-canvas" height="170" />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h6 className="mb-0 ">Hiring Momentum</h6>
                <p className="text-sm ">Monthly hiring trend</p>
                <hr className="dark horizontal" />
                <div className="d-flex ">
                  <i className="material-icons text-sm my-auto me-1">schedule</i>
                  <p className="mb-0 text-sm"> updated 2 min ago </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 mt-4 mb-3">
            <div className="card z-index-2 ">
              <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2 bg-transparent">
                <div className="bg-gradient-dark shadow-dark border-radius-lg py-3 pe-1">
                  <div className="chart">
                    <canvas id="chart-line-tasks" className="chart-canvas" height="170" />
                  </div>
                </div>
              </div>
              <div className="card-body">
                <h6 className="mb-0 ">Review Completion</h6>
                <p className="text-sm ">ATS vs admin review</p>
                <hr className="dark horizontal" />
                <div className="d-flex ">
                  <i className="material-icons text-sm my-auto me-1">schedule</i>
                  <p className="mb-0 text-sm">just updated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-muted text-sm mt-3">Refreshing data...</div>
        ) : null}
      </div>
      <AdminDashboardCharts />
    </main>
  );
}
