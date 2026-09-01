import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/metric-card";

import {
  createPlanAction,
  createPricingRuleAction,
  createSubscriptionAction,
  updatePlanAction,
  updatePricingRuleAction,
} from "../actions";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

type BillingPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SuperadminBillingPage({ searchParams }: BillingPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [companiesResult, plansResult, pricingRulesResult, subscriptionsResult] =
    await Promise.all([
      supabase.from("companies").select("id, name, code").order("name"),
      supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("pricing_rules").select("*").order("sort_order"),
      supabase
        .from("company_subscriptions")
        .select(
          "id, status, starts_on, ends_on, seats_purchased, price_override_inr, companies(name, code), subscription_plans(name, billing_cycle, base_price_inr)",
        )
        .order("created_at", { ascending: false }),
    ]);

  const companies = (companiesResult.data ?? []) as Array<{
    id: string;
    name: string;
    code: string;
  }>;
  const plans = (plansResult.data ?? []) as Array<{
    id: string;
    name: string;
    billing_cycle: string;
    billing_mode: string;
    base_price_inr: number;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>;
  const pricingRules = (pricingRulesResult.data ?? []) as Array<{
    id: string;
    name: string;
    description: string;
    base_price_inr: number;
    sort_order: number;
    is_active: boolean;
  }>;
  const subscriptions = (subscriptionsResult.data ?? []) as Array<{
    id: string;
    status: string;
    starts_on: string;
    ends_on: string | null;
    seats_purchased: number;
    price_override_inr: number | null;
    companies?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
    subscription_plans?:
      | { name?: string; billing_cycle?: string; base_price_inr?: number }
      | Array<{ name?: string; billing_cycle?: string; base_price_inr?: number }>
      | null;
  }>;
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active",
  );
  const trialSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "trial",
  );
  const projectedRevenue = activeSubscriptions.reduce((sum, subscription) => {
    const plan = Array.isArray(subscription.subscription_plans)
      ? subscription.subscription_plans[0]
      : subscription.subscription_plans;
    const amount = subscription.price_override_inr ?? plan?.base_price_inr ?? 0;
    return sum + Number(amount);
  }, 0);
  const recentSubscriptions = subscriptions.slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Billing</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Manage plans, pricing rules, and company subscriptions.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Subs"
          value={String(activeSubscriptions.length)}
          hint="Live subscriptions"
        />
        <MetricCard
          label="Trial Subs"
          value={String(trialSubscriptions.length)}
          hint="Companies in trial"
        />
        <MetricCard
          label="Projected Revenue"
          value={money(projectedRevenue)}
          hint="Active subscription value"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Subscription Records</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Seats</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Period</th>
                </tr>
              </thead>
              <tbody>
                {recentSubscriptions.map((subscription) => {
                  const company = Array.isArray(subscription.companies)
                    ? subscription.companies[0]
                    : subscription.companies;
                  const plan = Array.isArray(subscription.subscription_plans)
                    ? subscription.subscription_plans[0]
                    : subscription.subscription_plans;
                  const amount = subscription.price_override_inr ?? plan?.base_price_inr ?? 0;

                  return (
                    <tr key={subscription.id} className="border-t border-slate-200/70">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{company?.name ?? "Unknown company"}</div>
                        <div className="text-xs text-slate-500">{company?.code ?? "NA"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {plan?.name ?? "Unknown plan"}
                        <div className="text-xs text-slate-500">{plan?.billing_cycle ?? "NA"}</div>
                      </td>
                      <td className="py-3 pr-4 capitalize">{subscription.status}</td>
                      <td className="py-3 pr-4">{subscription.seats_purchased}</td>
                      <td className="py-3 pr-4">{money(Number(amount))}</td>
                      <td className="py-3 pr-4">
                        {formatDate(subscription.starts_on)} to {formatDate(subscription.ends_on)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form action={createSubscriptionAction} className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Assign Subscription</h3>
          <div className="mt-5 space-y-4">
            <select className="input-base" name="companyId" defaultValue="" required>
              <option value="" disabled>
                Select company
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
            <select className="input-base" name="planId" defaultValue="" required>
              <option value="" disabled>
                Select plan
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} | {money(Number(plan.base_price_inr))}
                </option>
              ))}
            </select>
            <div className="grid gap-4 sm:grid-cols-2">
              <select className="input-base" name="status" defaultValue="active" required>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
              <input
                className="input-base"
                type="number"
                name="seatsPurchased"
                min="1"
                defaultValue="1"
                placeholder="Seats purchased"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="input-base" type="date" name="startsOn" required />
              <input className="input-base" type="date" name="endsOn" />
            </div>
            <input
              className="input-base"
              type="number"
              min="0"
              step="0.01"
              name="priceOverrideInr"
              placeholder="Override price (optional)"
            />
            <button className="button-primary w-full" type="submit">
              Save Subscription
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form action={createPlanAction} className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Create Subscription Plan</h3>
          <div className="mt-5 space-y-4">
            <input className="input-base" name="name" placeholder="Plan name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="input-base" name="billingCycle" placeholder="Billing cycle" required />
              <input className="input-base" name="billingMode" placeholder="Billing mode" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="input-base"
                type="number"
                min="0"
                step="0.01"
                name="basePriceInr"
                placeholder="Base price"
                required
              />
              <input
                className="input-base"
                type="number"
                min="0"
                name="sortOrder"
                defaultValue="0"
                placeholder="Sort order"
              />
            </div>
            <textarea
              className="input-base min-h-24"
              name="description"
              placeholder="Plan description"
            />
            <button className="button-primary w-full" type="submit">
              Save Plan
            </button>
          </div>
        </form>

        <form action={createPricingRuleAction} className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Create Pricing Rule</h3>
          <div className="mt-5 space-y-4">
            <input className="input-base" name="name" placeholder="Rule name" required />
            <textarea
              className="input-base min-h-24"
              name="description"
              placeholder="Describe how this rule is applied"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="input-base"
                type="number"
                min="0"
                step="0.01"
                name="basePriceInr"
                placeholder="Base price"
                required
              />
              <input
                className="input-base"
                type="number"
                min="0"
                name="sortOrder"
                defaultValue="0"
                placeholder="Sort order"
              />
            </div>
            <button className="button-primary w-full" type="submit">
              Save Pricing Rule
            </button>
          </div>
        </form>
      </section>

      <section className="panel rounded-[30px] p-6">
        <h3 className="section-title">Current Pricing Catalog</h3>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5">
            <h4 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              Active Plans
            </h4>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{plan.name}</p>
                      <p>
                    {plan.billing_cycle} | {plan.billing_mode} |{" "}
                    {money(Number(plan.base_price_inr))}
                      </p>
                    </div>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                        Edit
                      </summary>
                      <form action={updatePlanAction} className="mt-3 min-w-[300px] space-y-3">
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/superadmin/billing" />
                        <input className="input-base" name="name" defaultValue={plan.name} required />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input className="input-base" name="billingCycle" defaultValue={plan.billing_cycle} required />
                          <input className="input-base" name="billingMode" defaultValue={plan.billing_mode} required />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input className="input-base" type="number" min="0" step="0.01" name="basePriceInr" defaultValue={plan.base_price_inr} required />
                          <input className="input-base" type="number" min="0" name="sortOrder" defaultValue={plan.sort_order} required />
                        </div>
                        <textarea className="input-base min-h-20" name="description" defaultValue={plan.description ?? ""} />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" name="isActive" defaultChecked={plan.is_active} />
                          Active
                        </label>
                        <button className="button-primary w-full" type="submit">
                          Update Plan
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5">
            <h4 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              Pricing Rules
            </h4>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              {pricingRules.map((rule) => (
                <div key={rule.id} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{rule.name}</p>
                      <p>{rule.description}</p>
                      <p>{money(Number(rule.base_price_inr))}</p>
                    </div>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                        Edit
                      </summary>
                      <form action={updatePricingRuleAction} className="mt-3 min-w-[300px] space-y-3">
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/superadmin/billing" />
                        <input className="input-base" name="name" defaultValue={rule.name} required />
                        <textarea className="input-base min-h-20" name="description" defaultValue={rule.description} required />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input className="input-base" type="number" min="0" step="0.01" name="basePriceInr" defaultValue={rule.base_price_inr} required />
                          <input className="input-base" type="number" min="0" name="sortOrder" defaultValue={rule.sort_order} required />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" name="isActive" defaultChecked={rule.is_active} />
                          Active
                        </label>
                        <button className="button-primary w-full" type="submit">
                          Update Rule
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
