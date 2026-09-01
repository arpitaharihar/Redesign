"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redirectTo: z.string().min(1),
  expectedRole: z.enum(["superadmin", "company_admin", "employee"]).optional(),
});

function roleLabel(role: AppRole) {
  return role.replace("_", " ");
}

export async function signInAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
    expectedRole: formData.get("expectedRole") || undefined,
  });

  if (!parsed.success) {
    const fallback = String(formData.get("redirectTo") || "/login/superadmin");
    redirect(`${fallback}?error=Enter+a+valid+email+and+password`);
  }

  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(`${parsed.data.redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (parsed.data.expectedRole && data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        `
          role,
          profile_completed,
          face_enrolled,
          companies (
            code
          )
        `,
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.role !== parsed.data.expectedRole) {
      await supabase.auth.signOut();
      const message = profile?.role
        ? `This account is registered for ${roleLabel(profile.role as AppRole)} access.`
        : "This account is not provisioned for this portal.";

      redirect(`${parsed.data.redirectTo}?error=${encodeURIComponent(message)}`);
    }

    if (parsed.data.expectedRole === "employee" && profile) {
      const company = Array.isArray(profile.companies)
        ? profile.companies[0]
        : profile.companies;

      if (profile.profile_completed && profile.face_enrolled) {
        await supabase.auth.signOut();
        const nextParams = new URLSearchParams({
          success: "Secure setup is complete. Continue with face authentication.",
          email: parsed.data.email,
        });

        if (company?.code) {
          nextParams.set("companyCode", company.code as string);
        }

        redirect(`/login/employee?${nextParams.toString()}`);
      }

      redirect("/dashboard/employee/onboarding");
    }
  }

  redirect("/dashboard");
}
