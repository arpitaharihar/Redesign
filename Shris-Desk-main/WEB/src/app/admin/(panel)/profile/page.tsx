"use client";

import { useEffect, useState } from "react";

import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type ProfileData = {
  full_name: string | null;
  email: string;
  department: string | null;
  role: string;
  face_enrolled: boolean;
  profile_completed: boolean;
  created_at: string;
};

export default function AdminProfilePage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [details, setDetails] = useState<ProfileData | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!profile?.id) return;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, department, role, face_enrolled, profile_completed, created_at")
        .eq("id", profile.id)
        .single();
      setDetails((data ?? null) as ProfileData | null);
    };

    if (profile?.id) {
      loadProfile();
    }
  }, [profile?.id]);

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading profile...</div>;
  }

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Profile" breadcrumb="Profile" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex flex-column flex-md-row justify-content-between">
            <div>
              <h3 className="mb-2">{details?.full_name ?? "Company Admin"}</h3>
              <p className="mb-0 text-white-50">{details?.email}</p>
            </div>
            <div className="mt-3 mt-md-0">
              <span className="badge bg-dark text-white">Role: {details?.role}</span>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="text-uppercase text-secondary text-xs mb-3">
                  Account Status
                </h6>
                <p className="mb-2 text-sm">
                  Face enrolled:{" "}
                  <span className={details?.face_enrolled ? "text-success" : "text-danger"}>
                    {details?.face_enrolled ? "Yes" : "No"}
                  </span>
                </p>
                <p className="mb-2 text-sm">
                  Profile completed:{" "}
                  <span
                    className={details?.profile_completed ? "text-success" : "text-danger"}
                  >
                    {details?.profile_completed ? "Yes" : "No"}
                  </span>
                </p>
                <p className="mb-0 text-sm">
                  Joined: {details?.created_at ? new Date(details.created_at).toDateString() : "-"}
                </p>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card h-100">
              <div className="card-header pb-0">
                <h6>Profile Information</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <p className="text-sm text-muted mb-1">Full name</p>
                    <h6 className="mb-0">{details?.full_name ?? "Not set"}</h6>
                  </div>
                  <div className="col-md-6">
                    <p className="text-sm text-muted mb-1">Department</p>
                    <h6 className="mb-0">{details?.department ?? "Not set"}</h6>
                  </div>
                  <div className="col-md-6">
                    <p className="text-sm text-muted mb-1">Email</p>
                    <h6 className="mb-0">{details?.email ?? "Not set"}</h6>
                  </div>
                  <div className="col-md-6">
                    <p className="text-sm text-muted mb-1">Role</p>
                    <h6 className="mb-0 text-capitalize">{details?.role ?? "admin"}</h6>
                  </div>
                </div>
                <div className="alert alert-info mt-4 mb-0">
                  For security reasons, contact a superadmin to update role details.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
