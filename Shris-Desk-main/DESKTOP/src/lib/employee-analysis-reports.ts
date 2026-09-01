import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmployeeAnalyticsSummary } from "@/lib/employee-analytics";

type RawApplicationReportRow = {
  id: string;
  company_id: string;
  opening_id: string | null;
  full_name: string;
  email: string;
  desired_role: string;
  status: string;
  ats_score: number | null;
  ats_threshold_at_submission: number | null;
  cover_letter: string | null;
  ats_report: Record<string, unknown> | null;
  job_openings?:
    | {
        title?: string | null;
        department?: string | null;
        ats_keywords?: string | null;
      }
    | Array<{
        title?: string | null;
        department?: string | null;
        ats_keywords?: string | null;
      }>
    | null;
};

export type EmployeeAnalysisReport = {
  id: string;
  companyId: string;
  applicationId: string | null;
  profileId: string | null;
  reportStage: string;
  recommendationLevel: string;
  subjectName: string;
  subjectEmail: string;
  readinessScore: number;
  summary: string;
  adminRecommendation: string;
  strengths: string[];
  risks: string[];
  recommendedActions: string[];
  sourceMetrics: Record<string, unknown>;
  lastGeneratedAt: string;
  createdAt: string;
};

export type EmployeeAnalysisInsight = {
  label: string;
  score: number;
  summary: string;
  recommendation: string;
  strengths: string[];
  risks: string[];
  actions: string[];
  stage: string;
  sourceMetrics: Record<string, unknown>;
};

type StoredReportRow = {
  id: string;
  company_id: string;
  application_id: string | null;
  profile_id: string | null;
  report_stage: string;
  recommendation_level: string;
  subject_name: string;
  subject_email: string;
  readiness_score: number;
  summary: string;
  admin_recommendation: string;
  strengths: unknown;
  risks: unknown;
  recommended_actions: unknown;
  source_metrics: unknown;
  last_generated_at: string;
  created_at: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeOpeningRecord(
  opening:
    | RawApplicationReportRow["job_openings"]
    | null
    | undefined,
) {
  return Array.isArray(opening) ? opening[0] : opening;
}

function parseKeywords(keywords: string | null | undefined) {
  return (keywords ?? "")
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function tokenizeText(text: string | null | undefined) {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function buildHeuristicAtsAssessment(input: {
  desiredRole: string;
  coverLetter: string;
  threshold: number;
  openingKeywords?: string | null;
  openingTitle?: string | null;
}) {
  const tokens = new Set([
    ...tokenizeText(input.desiredRole),
    ...tokenizeText(input.coverLetter),
  ]);
  const keywordList = Array.from(
    new Set([
      ...parseKeywords(input.openingKeywords),
      ...tokenizeText(input.desiredRole),
      ...tokenizeText(input.openingTitle ?? ""),
      "communication",
      "teamwork",
      "problem",
      "delivery",
      "ownership",
    ]),
  );

  const matchedKeywords = keywordList.filter((keyword) => tokens.has(keyword));
  const coverage = keywordList.length ? matchedKeywords.length / keywordList.length : 0;
  const communicationSignal = input.coverLetter.length >= 160 ? 12 : input.coverLetter.length >= 90 ? 7 : 2;
  const roleSignal = tokenizeText(input.desiredRole).length >= 2 ? 8 : 4;
  const score = clamp(42 + coverage * 38 + communicationSignal + roleSignal, 35, 96);
  const recommendation =
    score >= input.threshold + 10
      ? "Candidate is a strong ATS match. Recommend fast-tracking into shortlist and technical validation."
      : score >= input.threshold
        ? "Candidate clears the ATS bar. Recommend structured review and role-fit interview."
        : "Candidate is below the ATS bar. Recommend manual review only if the role is hard to fill or referral-backed.";

  return {
    score,
    matchedKeywords,
    coverage: Math.round(coverage * 100),
    recommendation,
    strengths: [
      ...(matchedKeywords.length >= 3
        ? [`Matched ${matchedKeywords.length} role-relevant keywords across the application.`]
        : []),
      ...(input.coverLetter.length >= 160
        ? ["Submitted a detailed cover letter, which suggests stronger communication readiness."]
        : []),
    ],
    risks: [
      ...(score < input.threshold
        ? ["ATS score is below the current role threshold and needs manual review."]
        : []),
      ...(matchedKeywords.length < 3
        ? ["Application shows limited keyword overlap with the target role requirements."]
        : []),
    ],
  };
}

function mapStoredReport(row: StoredReportRow): EmployeeAnalysisReport {
  return {
    id: row.id,
    companyId: row.company_id,
    applicationId: row.application_id,
    profileId: row.profile_id,
    reportStage: row.report_stage,
    recommendationLevel: row.recommendation_level,
    subjectName: row.subject_name,
    subjectEmail: row.subject_email,
    readinessScore: row.readiness_score,
    summary: row.summary,
    adminRecommendation: row.admin_recommendation,
    strengths: normalizeArray(row.strengths),
    risks: normalizeArray(row.risks),
    recommendedActions: normalizeArray(row.recommended_actions),
    sourceMetrics: normalizeObject(row.source_metrics),
    lastGeneratedAt: row.last_generated_at,
    createdAt: row.created_at,
  };
}

function buildApplicationReportPayload(application: RawApplicationReportRow) {
  const opening = normalizeOpeningRecord(application.job_openings);
  const heuristic =
    application.ats_score && application.ats_score > 0
      ? null
      : buildHeuristicAtsAssessment({
          desiredRole: application.desired_role,
          coverLetter: application.cover_letter ?? "",
          threshold: Number(application.ats_threshold_at_submission ?? 60),
          openingKeywords: opening?.ats_keywords ?? null,
          openingTitle: opening?.title ?? application.desired_role,
        });
  const effectiveScore = clamp(
    Number(application.ats_score ?? heuristic?.score ?? 0),
    0,
    100,
  );
  const threshold = Number(application.ats_threshold_at_submission ?? 60);
  const passed = effectiveScore >= threshold;
  const stage =
    application.status === "hired"
      ? "hired_bootstrap"
      : ["shortlisted", "approved"].includes(application.status)
        ? "ats_screening"
        : "ats_screening";
  const strengths = [
    ...(heuristic?.strengths ?? []),
    ...(passed ? ["ATS score clears the current job threshold."] : []),
    ...(["shortlisted", "approved", "hired"].includes(application.status)
      ? ["Candidate has advanced beyond initial ATS screening."]
      : []),
  ];
  const risks = [
    ...(heuristic?.risks ?? []),
    ...(["ats_rejected", "rejected"].includes(application.status)
      ? ["Candidate was previously marked for rejection in the hiring pipeline."]
      : []),
  ];
  const recommendationLevel = application.status === "hired"
    ? "recommended"
    : passed
      ? "recommended"
      : "observe";
  const readinessScore = clamp(
    effectiveScore + (application.status === "hired" ? 6 : application.status === "shortlisted" ? 4 : 0),
    0,
    100,
  );
  const summary =
    application.status === "hired"
      ? `${application.full_name} joined with an ATS baseline of ${effectiveScore}/${threshold} and is ready for tracked onboarding analysis.`
      : `${application.full_name} is carrying an ATS readiness score of ${effectiveScore}/${threshold} for ${opening?.title ?? application.desired_role}.`;
  const adminRecommendation =
    application.status === "hired"
      ? "Start the employee on a 30-day onboarding watchlist and compare live delivery data against the hiring baseline."
      : heuristic?.recommendation ??
        (passed
          ? "Recommend moving this candidate into structured admin review."
          : "Keep this candidate in manual review unless there is a strong contextual reason to continue.");
  const recommendedActions = application.status === "hired"
    ? [
        "Track first 30-day attendance and work-session consistency.",
        "Compare first submission reviews against ATS readiness expectations.",
        "Assign controlled starter tasks before increasing project ownership.",
      ]
    : passed
      ? [
          "Shortlist for structured role-fit interview.",
          "Validate technical depth against the opening requirements.",
          "Confirm communication quality during admin review.",
        ]
      : [
          "Review the application manually before shortlist.",
          "Check whether domain experience compensates for the ATS gap.",
          "Request stronger portfolio or work proof if needed.",
        ];

  return {
    report_stage: stage,
    recommendation_level: recommendationLevel,
    subject_name: application.full_name,
    subject_email: application.email,
    readiness_score: readinessScore,
    summary,
    admin_recommendation: adminRecommendation,
    strengths,
    risks,
    recommended_actions: recommendedActions,
    source_metrics: {
      atsScore: effectiveScore,
      atsThreshold: threshold,
      applicationStatus: application.status,
      desiredRole: application.desired_role,
      openingTitle: opening?.title ?? application.desired_role,
      keywordCoverage: heuristic?.coverage ?? null,
      matchedKeywords: heuristic?.matchedKeywords ?? [],
    },
  };
}

export function buildLiveEmployeeInsight(input: {
  analytics: EmployeeAnalyticsSummary;
  baselineReport?: EmployeeAnalysisReport | null;
}): EmployeeAnalysisInsight {
  const { analytics, baselineReport } = input;
  const baselineAts = Number(baselineReport?.sourceMetrics.atsScore ?? 0);
  const combinedScore = clamp(
    analytics.performanceScore * 0.72 + (baselineAts || analytics.performanceScore) * 0.28,
    0,
    100,
  );
  const label =
    combinedScore >= 85
      ? "High Potential"
      : combinedScore >= 72
        ? "Stable Contributor"
        : "Needs Support";
  const strengths = [
    ...(baselineReport?.strengths ?? []),
    ...(analytics.attendanceRate >= 90
      ? ["Attendance consistency is strong and dependable."]
      : []),
    ...(analytics.submissionAcceptanceRate >= 75 && analytics.reviewedSubmissions > 0
      ? ["Submission quality is translating into strong acceptance outcomes."]
      : []),
    ...(analytics.overdueTasks === 0 && analytics.totalTasks > 0
      ? ["No overdue tasks are currently blocking delivery."]
      : []),
  ].slice(0, 4);
  const risks = [
    ...(baselineReport?.risks ?? []),
    ...(analytics.overdueTasks > 0
      ? [`${analytics.overdueTasks} overdue task(s) are increasing delivery risk.`]
      : []),
    ...(analytics.attendanceRate < 80
      ? ["Attendance consistency is below the expected operating level."]
      : []),
    ...(analytics.pendingReviewSubmissions > 1
      ? ["There are multiple pending submissions waiting on closure."]
      : []),
    ...(analytics.reviewedSubmissions > 0 && analytics.submissionAcceptanceRate < 50
      ? ["Submission acceptance trend suggests quality coaching is needed."]
      : []),
  ].slice(0, 4);
  const recommendation =
    combinedScore >= 85
      ? "Recommend expanding ownership, assigning higher-complexity work, and considering the employee for stronger client-facing trust."
      : combinedScore >= 72
        ? "Recommend maintaining current load with periodic quality review and gradual project expansion."
        : "Recommend focused coaching on attendance, delivery discipline, or review quality before assigning larger ownership.";
  const actions =
    combinedScore >= 85
      ? [
          "Increase project ownership on one active initiative.",
          "Use the employee in mentor or reviewer shadow capacity.",
          "Track whether performance remains stable under higher complexity.",
        ]
      : combinedScore >= 72
        ? [
            "Keep current workload balanced across active projects.",
            "Review pending submissions quickly to avoid avoidable backlog.",
            "Watch for changes in attendance or overdue task count.",
          ]
        : [
            "Reduce avoidable context switching and monitor working-time consistency.",
            "Review overdue work and tighten weekly task planning.",
            "Coach on submission quality before scaling project responsibility.",
          ];
  const summary =
    baselineReport
      ? `${analytics.profile.name} is operating at a live score of ${analytics.performanceScore} against a hiring baseline readiness of ${baselineReport.readinessScore}.`
      : `${analytics.profile.name} is operating at a live score of ${analytics.performanceScore} based on tracked attendance, work sessions, and delivery quality.`;

  return {
    label,
    score: combinedScore,
    summary,
    recommendation,
    strengths,
    risks,
    actions,
    stage: baselineReport ? "live_tracking_with_hiring_baseline" : "live_tracking",
    sourceMetrics: {
      baselineReadiness: baselineReport?.readinessScore ?? null,
      performanceScore: analytics.performanceScore,
      attendanceRate: analytics.attendanceRate,
      avgHoursPerDay: analytics.avgHoursPerDay,
      submissionAcceptanceRate: analytics.submissionAcceptanceRate,
      overdueTasks: analytics.overdueTasks,
    },
  };
}

export async function upsertApplicationAnalysisReport(applicationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select(
      "id, company_id, opening_id, full_name, email, desired_role, status, ats_score, ats_threshold_at_submission, cover_letter, ats_report, job_openings(title, department, ats_keywords)",
    )
    .eq("id", applicationId)
    .single();

  if (!application) {
    return null;
  }

  const payload = buildApplicationReportPayload(application as RawApplicationReportRow);
  const { data, error } = await supabase
    .from("employee_analysis_reports")
    .upsert(
      {
        company_id: application.company_id,
        application_id: application.id,
        ...payload,
        source_metrics: {
          ...payload.source_metrics,
          ...(normalizeObject((application as RawApplicationReportRow).ats_report) ?? {}),
        },
        last_generated_at: new Date().toISOString(),
      },
      { onConflict: "application_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return mapStoredReport(data as StoredReportRow);
}

export async function linkAnalysisReportToProfile(input: {
  applicationId: string;
  profileId: string;
}) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("employee_analysis_reports")
    .update({
      profile_id: input.profileId,
      report_stage: "hired_bootstrap",
      last_generated_at: new Date().toISOString(),
    })
    .eq("application_id", input.applicationId);
}

export async function backfillCompanyEmployeeAnalysisReports(companyId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: hiredApplications }, { data: employeeProfiles }] = await Promise.all([
    supabase
      .from("job_applications")
      .select("id, email")
      .eq("company_id", companyId)
      .eq("status", "hired"),
    supabase
      .from("profiles")
      .select("id, email")
      .eq("company_id", companyId)
      .eq("role", "employee"),
  ]);

  const profilesByEmail = new Map(
    (employeeProfiles ?? []).map((profile) => [profile.email.toLowerCase(), profile.id] as const),
  );

  let reportCount = 0;
  let linkedCount = 0;
  for (const application of hiredApplications ?? []) {
    const report = await upsertApplicationAnalysisReport(application.id);
    if (report) {
      reportCount += 1;
    }

    const matchedProfileId = profilesByEmail.get(application.email.toLowerCase());
    if (matchedProfileId) {
      await linkAnalysisReportToProfile({
        applicationId: application.id,
        profileId: matchedProfileId,
      });
      linkedCount += 1;
    }
  }

  return {
    hiredCount: hiredApplications?.length ?? 0,
    reportCount,
    linkedCount,
  };
}

export const getProfileAnalysisReports = cache(async (companyId: string, profileIds: string[]) => {
  if (profileIds.length === 0) {
    return new Map<string, EmployeeAnalysisReport>();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("employee_analysis_reports")
    .select("*")
    .eq("company_id", companyId)
    .in("profile_id", profileIds);

  return new Map(
    ((data ?? []) as StoredReportRow[]).map((row) => {
      const report = mapStoredReport(row);
      return [report.profileId ?? "", report] as const;
    }),
  );
});

export const getApplicationAnalysisReports = cache(async (companyId: string, applicationIds: string[]) => {
  if (applicationIds.length === 0) {
    return new Map<string, EmployeeAnalysisReport>();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("employee_analysis_reports")
    .select("*")
    .eq("company_id", companyId)
    .in("application_id", applicationIds);

  return new Map(
    ((data ?? []) as StoredReportRow[]).map((row) => {
      const report = mapStoredReport(row);
      return [report.applicationId ?? "", report] as const;
    }),
  );
});
