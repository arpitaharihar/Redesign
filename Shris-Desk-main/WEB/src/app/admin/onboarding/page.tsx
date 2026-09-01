"use client";

import { useEffect } from "react";

export default function AdminOnboardingPage() {
  useEffect(() => {
    window.location.href = "/admin/dashboard";
  }, []);

  return (
    <div className="sd-auth-shell">
      <div className="sd-auth-card text-center">
        <h4 className="mb-2">Onboarding disabled</h4>
        <p className="text-muted mb-0">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}
