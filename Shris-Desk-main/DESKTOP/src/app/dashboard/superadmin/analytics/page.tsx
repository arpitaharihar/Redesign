import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

type AnalyticsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SuperadminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [companiesResult, subscriptionsResult, reviewsResult] = await Promise.all([
    supabase.from("superadmin_company_overview").select("*").order("name"),
    supabase
      .from("company_subscriptions")
      .select(
        "id, status, seats_purchased, price_override_inr, companies(name, code), subscription_plans(name, base_price_inr)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("reviews").select("rating").order("created_at", { ascending: false }),
  ]);

  const companies = companiesResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];
  const reviews = reviewsResult.data ?? [];

  const totalCompanies = companies.length;
  const totalEmployees = companies.reduce(
    (sum, company) => sum + Number(company.employee_count ?? 0),
    0,
  );
  const totalProjects = companies.reduce(
    (sum, company) => sum + Number(company.project_count ?? 0),
    0,
  );
  const totalApplications = companies.reduce(
    (sum, company) => sum + Number(company.application_count ?? 0),
    0,
  );
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const pendingCompanies = companies.filter((company) => company.status === "pending").length;
  const pausedCompanies = companies.filter((company) => company.status === "paused").length;

  const subscriptionTotals = subscriptions.reduce(
    (acc, subscription) => {
      const plan = Array.isArray(subscription.subscription_plans)
        ? subscription.subscription_plans[0]
        : subscription.subscription_plans;
      const amount = Number(subscription.price_override_inr ?? plan?.base_price_inr ?? 0);

      acc.total += amount;
      if (subscription.status === "active") acc.active += 1;
      if (subscription.status === "trial") acc.trial += 1;
      if (subscription.status === "paused") acc.paused += 1;
      if (subscription.status === "expired") acc.expired += 1;

      return acc;
    },
    { total: 0, active: 0, trial: 0, paused: 0, expired: 0 },
  );

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "0.0";

  const topCompanies = [...companies]
    .sort((a, b) => Number(b.employee_count ?? 0) - Number(a.employee_count ?? 0))
    .slice(0, 5)
    .map(
      (company) =>
        `${company.name} | Employees: ${company.employee_count ?? 0} | Projects: ${company.project_count ?? 0}`,
    );

  const subscriptionMix = [
    `Active subscriptions: ${subscriptionTotals.active}`,
    `Trial subscriptions: ${subscriptionTotals.trial}`,
    `Paused subscriptions: ${subscriptionTotals.paused}`,
    `Expired subscriptions: ${subscriptionTotals.expired}`,
  ];

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Analytics</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Platform analytics and operational health signals.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Companies" value={String(totalCompanies)} hint="Total onboarded" />
        <MetricCard label="Employees" value={String(totalEmployees)} hint="Active workforce" />
        <MetricCard label="Projects" value={String(totalProjects)} hint="Tracked initiatives" />
        <MetricCard label="Applications" value={String(totalApplications)} hint="Hiring pipeline" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Orgs"
          value={String(activeCompanies)}
          hint="Running companies"
        />
        <MetricCard
          label="Pending Orgs"
          value={String(pendingCompanies)}
          hint="Awaiting approval"
        />
        <MetricCard label="Paused Orgs" value={String(pausedCompanies)} hint="On hold" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Subscription Mix"
          lines={subscriptionMix}
          emptyMessage="No subscriptions recorded yet."
        />
        <SectionCard
          title="Revenue Snapshot"
          lines={[
            `Projected recurring revenue: ${money(subscriptionTotals.total)}`,
            `Average rating: ${averageRating}/5`,
          ]}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top Companies By Headcount"
          lines={topCompanies}
          emptyMessage="No company data yet."
        />
        <SectionCard
          title="Company Health Signals"
          lines={[
            `Active: ${activeCompanies}`,
            `Pending: ${pendingCompanies}`,
            `Paused: ${pausedCompanies}`,
          ]}
        />
      </section>
    </div>
  );
}
