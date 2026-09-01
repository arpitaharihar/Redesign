"use client";

import { usePathname } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const links = [
  { href: "/admin/hiring", label: "Hiring Dashboard" },
  { href: "/admin/settings", label: "Security Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    sessionStorage.removeItem("face_verified");
    window.location.href = "/admin/login";
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div className="container">
        <a className="navbar-brand fw-bold" href="/admin/hiring">
          SmartDesk Admin
        </a>
        <div className="collapse navbar-collapse show">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {links.map((link) => (
              <li className="nav-item" key={link.href}>
                <a
                  className={`nav-link ${pathname === link.href ? "fw-semibold" : ""}`}
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
