"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createEmployeeFaceChallenge } from "@/lib/face-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const employeeFaceLoginSchema = z.object({
  email: z.string().trim().email(),
  companyCode: z.string().trim().min(2).max(12),
});

function redirectToEmployeeLogin(
  type: "error" | "success",
  message: string,
  extras?: Record<string, string>,
): never {
  const params = new URLSearchParams({
    [type]: message,
  });

  Object.entries(extras ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  redirect(`/login/employee?${params.toString()}`);
}

export async function beginEmployeeFaceLoginAction(formData: FormData) {
  const parsed = employeeFaceLoginSchema.safeParse({
    email: formData.get("email"),
    companyCode: formData.get("companyCode"),
  });

  if (!parsed.success) {
    redirectToEmployeeLogin(
      "error",
      "Enter a valid work email and company code before starting face login.",
    );
  }

  const values = parsed.data;

  const admin = createSupabaseAdminClient();
  const normalizedEmail = values.email.toLowerCase();
  const normalizedCompanyCode = values.companyCode.toUpperCase();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id")
    .eq("code", normalizedCompanyCode)
    .maybeSingle();

  if (companyError || !company) {
    redirectToEmployeeLogin("error", "Company code not found.", {
      email: normalizedEmail,
      companyCode: normalizedCompanyCode,
    });
  }

  const companyId = company.id as string;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, profile_completed, face_enrolled, is_active, role")
    .eq("company_id", companyId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "employee") {
    redirectToEmployeeLogin("error", "No employee account was found for that company and email.", {
      email: normalizedEmail,
      companyCode: normalizedCompanyCode,
    });
  }

  const employeeProfileId = profile.id as string;

  if (!profile.is_active) {
    redirectToEmployeeLogin("error", "This employee account is inactive. Contact your company admin.");
  }

  if (!profile.profile_completed || !profile.face_enrolled) {
    redirectToEmployeeLogin(
      "error",
      "Face login is available only after the first secure setup is completed.",
      {
        email: normalizedEmail,
        companyCode: normalizedCompanyCode,
      },
    );
  }

  const { data: faceProfile, error: faceProfileError } = await admin
    .from("employee_face_profiles")
    .select("id, active, sample_count")
    .eq("profile_id", employeeProfileId)
    .maybeSingle();

  if (
    faceProfileError ||
    !faceProfile ||
    !faceProfile.active ||
    (faceProfile.sample_count as number) < 3
  ) {
    redirectToEmployeeLogin(
      "error",
      "Face registration is incomplete for this employee account. Use the first-time setup path.",
      {
        email: normalizedEmail,
        companyCode: normalizedCompanyCode,
      },
    );
  }

  const challengeToken = await createEmployeeFaceChallenge(employeeProfileId);
  redirect(`/login/employee/verify?challenge=${challengeToken}`);
}
