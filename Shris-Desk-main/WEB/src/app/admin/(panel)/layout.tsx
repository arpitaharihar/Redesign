import Script from "next/script";

import { AdminBody } from "@/components/admin-body";
import { AdminPanelSidebar } from "@/components/admin-panel-sidebar";

export default function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-shell g-sidenav-show bg-gray-200">
      <AdminBody />
      <AdminPanelSidebar />
      {children}
      <Script src="/admin/js/core/popper.min.js" strategy="afterInteractive" />
      <Script src="/admin/js/core/bootstrap.min.js" strategy="afterInteractive" />
      <Script src="/admin/js/plugins/perfect-scrollbar.min.js" strategy="afterInteractive" />
      <Script src="/admin/js/plugins/smooth-scrollbar.min.js" strategy="afterInteractive" />
      <Script src="/admin/js/plugins/chartjs.min.js" strategy="afterInteractive" />
      <Script src="/admin/js/material-dashboard.min.js" strategy="afterInteractive" />
    </div>
  );
}
