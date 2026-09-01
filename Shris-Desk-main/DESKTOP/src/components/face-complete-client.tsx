"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function FaceCompleteClient() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash") ?? "";
  const next = searchParams.get("next") ?? "/dashboard/employee";
  const missingToken = tokenHash.length === 0;
  const [status, setStatus] = useState("Completing secure face sign-in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (missingToken) {
      return;
    }

    let cancelled = false;

    async function finishFaceSignIn() {
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });

      if (cancelled) {
        return;
      }

      if (verifyError) {
        setError(verifyError.message || "Unable to complete face sign-in.");
        return;
      }

      setStatus("Secure sign-in confirmed. Opening your workspace...");
      window.location.replace(next);
    }

    void finishFaceSignIn();

    return () => {
      cancelled = true;
    };
  }, [missingToken, next, tokenHash]);

  return (
    <section className="panel-strong w-full rounded-[30px] p-8">
      <span className="eyebrow">Face Sign-In</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
        Finalizing secure employee access
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">{status}</p>
      {missingToken ? (
        <>
          <p className="mt-4 text-sm leading-7 text-rose-600">
            Face sign-in token is missing. Start the employee face login again.
          </p>
          <div className="mt-6">
            <Link className="button-secondary" href="/login/employee">
              Return to Employee Login
            </Link>
          </div>
        </>
      ) : null}
      {error ? (
        <>
          <p className="mt-4 text-sm leading-7 text-rose-600">{error}</p>
          <div className="mt-6">
            <Link className="button-secondary" href="/login/employee">
              Return to Employee Login
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
