"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function roleHome(role: string | null | undefined) {
  switch (role) {
    case "superadmin":
      return "/dashboard/superadmin";
    case "company_admin":
      return "/dashboard/company-admin";
    case "employee":
      return "/dashboard/employee";
    default:
      return "/dashboard";
  }
}

export function AuthSessionRedirect() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const hasAuthTokens =
      hash.includes("access_token=") || hash.includes("refresh_token=");

    if (!hasAuthTokens) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let redirected = false;

    async function continueWithUser(userId: string) {
      if (redirected) {
        return;
      }

      redirected = true;
      setMessage("Secure sign-in confirmed. Opening your workspace...");

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      window.location.replace(roleHome((profile?.role as string | undefined) ?? null));
    }

    async function resolveSession() {
      setMessage("Finishing secure sign-in...");

      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.session?.user?.id) {
          window.history.replaceState(
            {},
            document.title,
            `${window.location.pathname}${window.location.search}`,
          );
          await continueWithUser(data.session.user.id);
          return;
        }
      }

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          await continueWithUser(session.user.id);
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        void continueWithUser(session.user.id);
      }
    });

    void resolveSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
      {message}
    </div>
  );
}
