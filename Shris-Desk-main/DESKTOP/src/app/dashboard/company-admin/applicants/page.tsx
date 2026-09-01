import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ApplicantsPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function CompanyApplicantsPage({ searchParams }: ApplicantsPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let applications: Array<{
    status: string;
    ats_score: number;
    full_name: string;
    email: string;
    created_at: string;
  }> = [];

  if (profile.companyId) {
    const { data } = await supabase
      .from("job_applications")
      .select("status, ats_score, full_name, email, created_at")
      .eq("company_id", profile.companyId)
      .order("created_at", { ascending: false });

    applications = data ?? [];
  }

  const statusCounts = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1;
    return acc;
  }, {});

  const averageAts =
    applications.length > 0
      ? (
          applications.reduce((sum, application) => sum + Number(application.ats_score ?? 0), 0) /
          applications.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Applicant Tracking</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Monitor your hiring funnel and applicant progress.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Applicants"
          value={String(applications.length)}
          hint="All submissions"
        />
        <MetricCard
          label="Shortlisted"
          value={String(statusCounts.shortlisted ?? 0)}
          hint="Ready for review"
        />
        <MetricCard
          label="Hired"
          value={String(statusCounts.hired ?? 0)}
          hint="Accepted offers"
        />
        <MetricCard label="Avg ATS" value={`${averageAts}%`} hint="Application quality" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pipeline Breakdown"
          lines={Object.entries(statusCounts).map(
            ([status, count]) => `${status.replace("_", " ")}: ${count}`,
          )}
          emptyMessage="No applications yet."
        />
        <SectionCard
          title="Recent Applicants"
          lines={applications.slice(0, 6).map(
            (application) => `${application.full_name} | ${application.email} | ${application.status}`,
          )}
          emptyMessage="No recent applicants yet."
        />
      </section>
    </div>
  );
}
