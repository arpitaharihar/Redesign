"use client";

import { useEffect, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

export default function AdminSettingsPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const nextSecret = sessionStorage.getItem("next_company_secret");
    if (nextSecret) {
      setSecret(nextSecret);
      sessionStorage.removeItem("next_company_secret");
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setStatus(null);
    const supabase = createSupabaseBrowserClient();
    const result = await supabase.rpc("generate_company_login_secret");
    if (result.error) {
      setStatus(result.error.message);
    } else {
      setSecret(result.data);
      setStatus("New secret generated. Save it securely.");
    }
    setLoading(false);
  };

  if (guardLoading) {
    return <div className="container py-5">Loading...</div>;
  }

  return (
    <>
      <AdminNav />
      <div className="container py-5">
        <h2 className="mb-2">Security Settings</h2>
        <p className="text-muted mb-4">
          Generate one-time secret keys for password sign-in and password recovery.
        </p>
        {status ? <div className="alert alert-info">{status}</div> : null}
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate New Secret Key"}
        </button>
        {secret ? (
          <div className="card shadow-sm p-3 mt-4">
            <p className="text-muted mb-1">Current one-time secret key</p>
            <h4 className="mb-0">{secret}</h4>
            <p className="text-muted small mt-2">
              This key becomes invalid after it is used once. Share only with trusted admins.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
