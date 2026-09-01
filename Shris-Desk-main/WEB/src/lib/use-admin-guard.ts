"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminProfile = {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
  profile_completed: boolean;
  face_enrolled: boolean;
  face_hash?: string | null;
};

type GuardState = {
  loading: boolean;
  profile: AdminProfile | null;
};

export function useAdminGuard(requireAdmin: boolean = true) {
  const [state, setState] = useState<GuardState>({ loading: true, profile: null });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      // 1. Check local storage session first (from custom API login)
      const localProfileStr = localStorage.getItem("profile");
      const localUserStr = localStorage.getItem("user");

      if (localProfileStr && localUserStr) {
        try {
          const parsedProfile = JSON.parse(localProfileStr) as AdminProfile;
          
          // Verify role allows admin access
          const allowedRoles = ["company_admin", "admin", "super_admin"];
          if (!parsedProfile.role || allowedRoles.includes(parsedProfile.role)) {
            if (isMounted) {
              setState({ loading: false, profile: parsedProfile });
            }
            return;
          }
        } catch (e) {
          console.error("Error reading profile from localStorage:", e);
        }
      }

      // 2. Fallback check with Supabase Auth session
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session;

      if (!session) {
        if (requireAdmin && isMounted) {
          window.location.href = "/admin/login";
        } else if (isMounted) {
          setState({ loading: false, profile: null });
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, role, company_id, profile_completed, face_enrolled, face_hash")
        .eq("id", session.user.id)
        .single();

      const allowedRoles = ["company_admin", "admin", "super_admin"];
      if (!profile || !allowedRoles.includes(profile.role)) {
        await supabase.auth.signOut();
        if (requireAdmin && isMounted) {
          window.location.href = "/admin/login";
        }
        return;
      }

      if (isMounted) {
        setState({ loading: false, profile });
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [requireAdmin]);

  return state;
}