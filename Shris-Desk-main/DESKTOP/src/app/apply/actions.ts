"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildHeuristicAtsAssessment,
  upsertApplicationAnalysisReport,
} from "@/lib/employee-analysis-reports";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const applicationSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  desiredRole: z.string().min(2),
  companyCode: z.string().min(2),
  resumeLink: z.string().url(),
  coverLetter: z.string().min(30),
});

export async function submitApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    desiredRole: formData.get("desiredRole"),
    companyCode: formData.get("companyCode"),
    resumeLink: formData.get("resumeLink"),
    coverLetter: formData.get("coverLetter"),
  });

  if (!parsed.success) {
    redirect("/apply?error=Please+complete+all+application+fields+correctly");
  }

  const supabase = await createSupabaseServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, ats_threshold")
    .eq("code", parsed.data.companyCode.toUpperCase())
    .maybeSingle();

  if (!company) {
    redirect("/apply?error=Company+code+not+found");
  }

  const { data: openings } = await supabase
    .from("job_openings")
    .select("id, title, ats_keywords")
    .eq("company_id", company.id)
    .eq("status", "published");

  const matchedOpening =
    (openings ?? []).find(
      (opening) =>
        opening.title.toLowerCase().includes(parsed.data.desiredRole.toLowerCase()) ||
        parsed.data.desiredRole.toLowerCase().includes(opening.title.toLowerCase()),
    ) ?? null;

  const heuristic = buildHeuristicAtsAssessment({
    desiredRole: parsed.data.desiredRole,
    coverLetter: parsed.data.coverLetter,
    threshold: company.ats_threshold,
    openingKeywords: matchedOpening?.ats_keywords ?? null,
    openingTitle: matchedOpening?.title ?? parsed.data.desiredRole,
  });

  const { data: insertedApplication, error } = await supabase
    .from("job_applications")
    .insert({
      company_id: company.id,
      opening_id: matchedOpening?.id ?? null,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      desired_role: parsed.data.desiredRole,
      resume_link: parsed.data.resumeLink,
      cover_letter: parsed.data.coverLetter,
      ats_score: heuristic.score,
      ats_threshold_at_submission: company.ats_threshold,
      status: "submitted",
      ats_report: {
        generated_by: "smartdesk_heuristic_ats",
        keyword_coverage: heuristic.coverage,
        matched_keywords: heuristic.matchedKeywords,
        recommendation: heuristic.recommendation,
      },
    })
    .select("id")
    .single();

  if (error || !insertedApplication) {
    redirect(`/apply?error=${encodeURIComponent(error?.message ?? "Unable to submit application")}`);
  }

  await upsertApplicationAnalysisReport(insertedApplication.id);

  redirect(
    "/apply?success=Application+submitted.+It+is+now+visible+to+the+assigned+company+admin.",
  );
}
