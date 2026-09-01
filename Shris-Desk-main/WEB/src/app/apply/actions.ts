"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { calculateAtsScore } from "@/lib/ats";
import { createSupabaseServerClient } from "@/lib/supabase";

const applicationSchema = z.object({
  companyCode: z.string().trim().min(2),
  openingId: z.string().uuid(),
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  address: z.string().trim().min(3),
  countryCode: z.string().trim().min(1),
  contact: z.string().trim().min(6),
  resumeLink: z.string().url(),
  coverLetter: z.string().trim().min(1),
});

function redirectWithError(message: string): never {
  redirect(`/apply?error=${encodeURIComponent(message)}`);
}

export async function submitApplicationAction(formData: FormData) {
  const resumeRaw = String(formData.get("resumeLink") ?? "").trim();
  const normalizedResume =
    resumeRaw && !resumeRaw.startsWith("http://") && !resumeRaw.startsWith("https://")
      ? `https://${resumeRaw}`
      : resumeRaw;

  const payload = {
    companyCode: formData.get("companyCode"),
    openingId: formData.get("openingId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    address: formData.get("address"),
    countryCode: formData.get("countryCode"),
    contact: formData.get("contact"),
    resumeLink: normalizedResume,
    coverLetter: formData.get("coverLetter"),
  };

  const parsed = applicationSchema.safeParse(payload);

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).filter(Boolean);
    redirectWithError(
      `Please complete all fields with valid details. Invalid: ${fields.join(", ") || "form"}.`,
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: company, error: companyError } = await supabase
    .rpc("get_company_public", { company_code: parsed.data.companyCode.toUpperCase() })
    .maybeSingle();

  if (companyError || !company) {
    redirectWithError("Unable to find that company. Please verify the company code.");
  }

  const { data: opening, error: openingError } = await supabase
    .from("job_openings")
    .select("id, title, min_ats_score, ats_keywords")
    .eq("id", parsed.data.openingId)
    .eq("company_id", company.id)
    .eq("status", "published")
    .maybeSingle();

  if (openingError || !opening) {
    redirectWithError("Please select a valid opening.");
  }

  const keywords = opening.ats_keywords
    ? opening.ats_keywords.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  const score = calculateAtsScore({
    coverLetter: parsed.data.coverLetter,
    resumeLink: parsed.data.resumeLink,
    openingTitle: opening.title,
    desiredRole: opening.title,
    keywords,
  });
  const threshold = Math.max(Number(company.ats_threshold ?? 0), Number(opening.min_ats_score ?? 0));
  const status = score >= threshold ? "ats_reviewed" : "ats_rejected";
  const coverLetter = `${parsed.data.coverLetter}\n\nAddress: ${parsed.data.address}`;

  const { data: submissionId, error } = await supabase.rpc(
    "submit_job_application_public",
    {
      company_code: parsed.data.companyCode.toUpperCase(),
      opening_id: opening.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: `${parsed.data.countryCode} ${parsed.data.contact}`,
      desired_role: opening.title,
      resume_link: parsed.data.resumeLink,
      cover_letter: coverLetter,
      ats_score: score,
      ats_threshold: threshold,
      status,
    },
  );

  if (error || !submissionId) {
    redirectWithError(error?.message ?? "Unable to submit application right now.");
  }

  redirect(`/apply/success?id=${submissionId}`);
}
