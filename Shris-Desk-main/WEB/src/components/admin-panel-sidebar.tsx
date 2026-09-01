"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const navSections = [
  {
    title: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/notifications", label: "Notifications", icon: "notifications" },
    ],
  },
  {
    title: "Hiring",
    items: [
      { href: "/admin/tables", label: "Applicants", icon: "table_view" },
      { href: "/admin/hiring", label: "Openings", icon: "work" },
      { href: "/admin/hired", label: "Hired", icon: "person" },
    ],
  },
  {
    title: "Finance",
    items: [{ href: "/admin/billing", label: "Billing", icon: "receipt_long" }],
  },
  {
    title: "Profile",
    items: [
      { href: "/admin/profile", label: "Profile", icon: "account_circle" },
      { href: "/admin/settings", label: "Security", icon: "lock" },
    ],
  },
];

export function AdminPanelSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem("face_verified");
    window.location.href = "/admin/login";
  };

  return (
    <aside
      className="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark"
      id="sidenav-main"
    >
      <div className="sidenav-header">
        <i
          className="fas fa-times p-3 cursor-pointer text-white opacity-5 position-absolute end-0 top-0 d-none d-xl-none"
          aria-hidden="true"
          id="iconSidenav"
        />
        <a className="navbar-brand m-0" href="/admin/dashboard">
          <span className="ms-1 font-weight-bold text-white">SmartDesk Admin</span>
        </a>
      </div>
      <hr className="horizontal light mt-0 mb-2" />
      <div className="navbar-collapse w-auto max-height-vh-100 show" id="sidenav-collapse-main">
        <ul className="navbar-nav">
          {navSections.map((section) => (
            <Fragment key={section.title}>
              <li className="nav-item" key={`${section.title}-header`}>
                <h6 className="ps-4 ms-2 mt-3 text-uppercase text-xs text-white font-weight-bolder opacity-8">
                  {section.title}
                </h6>
              </li>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li className="nav-item" key={item.href}>
                    <a
                      className={`nav-link text-white ${active ? "active bg-gradient-primary" : ""}`}
                      href={item.href}
                    >
                      <div className="text-white text-center me-2 d-flex align-items-center justify-content-center">
                        <i className="material-icons opacity-10">{item.icon}</i>
                      </div>
                      <span className="nav-link-text ms-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </Fragment>
          ))}
          <li className="nav-item mt-3">
            <h6 className="ps-4 ms-2 text-uppercase text-xs text-white font-weight-bolder opacity-8">
              Account
            </h6>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className="btn btn-danger btn-md w-100 mt-2"
              onClick={handleLogout}
            >
              <i className="material-icons">logout</i> Logout
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}
