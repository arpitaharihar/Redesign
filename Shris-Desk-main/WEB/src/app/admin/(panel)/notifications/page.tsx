"use client";

import { useEffect, useState } from "react";

import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function AdminNotificationsPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.company_id) return;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("job_applications")
        .select("id, full_name, desired_role, status, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(12);

      const mapped =
        data?.map((item) => ({
          id: item.id,
          title: "Applicant update",
          message: `${item.full_name} applied for ${item.desired_role}. Status: ${item.status}.`,
          created_at: item.created_at,
        })) ?? [];

      setNotifications(mapped);
    };

    if (profile?.company_id) {
      loadNotifications();
    }
  }, [profile?.company_id]);

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading notifications...</div>;
  }

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Notifications" breadcrumb="Notifications" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h3 className="mb-2">Alerts Center</h3>
              <p className="mb-0 text-white-50">
                Latest applicant updates and hiring actions.
              </p>
            </div>
            <span className="badge bg-light text-dark">Last 12 updates</span>
          </div>
        </div>
        <div className="card">
          <div className="sd-card-header">
            <h6 className="text-white text-capitalize mb-0">Notifications</h6>
          </div>
          <div className="card-body p-3">
            {notifications.length === 0 ? (
              <p className="text-muted">No notifications yet.</p>
            ) : (
              <ul className="list-group">
                {notifications.map((item) => (
                  <li key={item.id} className="list-group-item border-0 d-flex align-items-start">
                    <div className="avatar avatar-sm bg-gradient-primary me-3">
                      <i className="material-icons text-white">notifications</i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 text-sm">{item.title}</h6>
                      <p className="mb-1 text-sm text-muted">{item.message}</p>
                      <p className="mb-0 text-xs text-secondary">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
