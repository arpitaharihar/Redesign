import { redirect } from "next/navigation";
import Link from "next/link";

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

type SuperadminPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SuperadminPage({ searchParams }: SuperadminPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [
    companiesResult,
    plansResult,
    reviewsResult,
    pricingRulesResult,
    adminsResult,
  ] = await Promise.all([
    supabase.from("superadmin_company_overview").select("*").order("name"),
    supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("reviews")
      .select("reviewer_name, rating, feedback_type, note, companies(name)")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("pricing_rules").select("*").order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, email, company_id, created_at, companies(name, code)")
      .eq("role", "company_admin")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const companies = companiesResult.data ?? [];
  const plans = plansResult.data ?? [];
  const reviews = reviewsResult.data ?? [];
  const pricingRules = pricingRulesResult.data ?? [];
  const admins = (adminsResult.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string;
    company_id: string | null;
    created_at: string;
    companies?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
  }>;

  const totalEmployees = companies.reduce(
    (sum, company) => sum + Number(company.employee_count ?? 0),
    0,
  );
  const totalProjects = companies.reduce(
    (sum, company) => sum + Number(company.project_count ?? 0),
    0,
  );
  const projectedRevenue = companies.reduce(
    (sum, company) => sum + Number(company.active_subscription_value_inr ?? 0),
    0,
  );
  const pendingCompanies = companies.filter((company) => company.status === "pending").length;
  const pausedCompanies = companies.filter((company) => company.status === "paused").length;
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const unassignedAdmins = admins.filter((admin) => !admin.company_id).length;
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Superadmin Overview</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Platform-wide control across companies, pricing, and admin access
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Companies"
            value={String(companies.length)}
            hint="Total enrolled companies"
          />
          <MetricCard
            label="Employees"
            value={String(totalEmployees)}
            hint="Active employees across all companies"
          />
          <MetricCard
            label="Projects"
            value={String(totalProjects)}
            hint="Tracked projects across the platform"
          />
          <MetricCard
            label="Revenue"
            value={money(projectedRevenue)}
            hint="Projected active subscription value"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="button-primary" href="/dashboard/superadmin/companies">
            Manage Companies
          </Link>
          <Link className="button-secondary" href="/dashboard/superadmin/analytics">
            View Analytics
          </Link>
          <Link className="button-secondary" href="/dashboard/superadmin/billing">
            Manage Billing
          </Link>
          <Link className="button-secondary" href="/dashboard/superadmin/access">
            Manage Access
          </Link>
          <Link className="button-secondary" href="/dashboard/superadmin/feedback">
            Manage Feedback
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Active Companies"
          value={String(activeCompanies)}
          hint="Currently operating organizations"
        />
        <MetricCard
          label="Pending Reviews"
          value={String(pendingCompanies)}
          hint="Companies awaiting activation"
        />
        <MetricCard
          label="Paused Accounts"
          value={String(pausedCompanies)}
          hint="Companies on hold or paused"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Company Enrollment And Health</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Employees</th>
                  <th className="pb-3 pr-4">Projects</th>
                  <th className="pb-3 pr-4">Applications</th>
                  <th className="pb-3 pr-4">ATS</th>
                  <th className="pb-3 pr-4">Plan Value</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-t border-slate-200/70">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{company.name}</div>
                      <div className="text-xs text-slate-500">{company.code}</div>
                    </td>
                    <td className="py-3 pr-4">{company.employee_count}</td>
                    <td className="py-3 pr-4">{company.project_count}</td>
                    <td className="py-3 pr-4">{company.application_count}</td>
                    <td className="py-3 pr-4">{company.ats_threshold}%</td>
                    <td className="py-3 pr-4">
                      {money(Number(company.active_subscription_value_inr ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Active Subscription Plans"
            lines={plans.map(
              (plan) =>
                `${plan.name} | ${plan.billing_cycle} | ${money(
                  Number(plan.base_price_inr ?? 0),
                )}`,
            )}
          />
          <SectionCard
            title="Pricing Rules"
            lines={pricingRules.map(
              (rule) =>
                `${rule.name}: ${rule.description} (${money(
                  Number(rule.base_price_inr ?? 0),
                )})`,
            )}
            emptyMessage="No pricing rules configured yet."
          />
          <SectionCard
            title="Recent Feedback"
            lines={reviews.map((review) => {
              const companyRecord = review.companies as
                | { name?: string }
                | Array<{ name?: string }>
                | null
                | undefined;
              const company = Array.isArray(companyRecord)
                ? companyRecord[0]?.name
                : companyRecord?.name;
              return `${company ?? "Platform"} | ${review.reviewer_name} | ${review.feedback_type} | ${review.rating}/5`;
            })}
            emptyMessage="No feedback captured yet."
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Operational Alerts"
          lines={[
            `Pending company approvals: ${pendingCompanies}`,
            `Paused company accounts: ${pausedCompanies}`,
            `Unassigned company admins: ${unassignedAdmins}`,
            `Average feedback rating: ${averageRating}/5`,
          ]}
        />
        <SectionCard
          title="Recent Company Admins"
          lines={admins.map((admin) => {
            const company = Array.isArray(admin.companies) ? admin.companies[0] : admin.companies;
            return `${admin.full_name ?? admin.email} | ${company?.name ?? "Unassigned"} | ${company?.code ?? "NA"}`;
          })}
          emptyMessage="No company admins onboarded yet."
        />
      </section>
    </div>
  );
}
