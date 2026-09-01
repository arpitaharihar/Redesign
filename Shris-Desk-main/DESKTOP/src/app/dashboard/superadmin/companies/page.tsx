import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/metric-card";
import { CompanyDirectoryModal } from "@/components/company-directory-modal";

import { createCompanyAction, updateCompanyAction } from "../actions";

type CompaniesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SuperadminCompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [overviewResult, detailsResult] = await Promise.all([
    supabase.from("superadmin_company_overview").select("*").order("name"),
    supabase.from("companies").select("id, contact_email, notes").order("name"),
  ]);

  const companyDetails = new Map(
    (detailsResult.data ?? []).map((company) => [
      company.id as string,
      {
        contact_email: (company.contact_email as string | null) ?? "",
        notes: (company.notes as string | null) ?? "",
      },
    ]),
  );
  const companies = (overviewResult.data ?? []) as Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    ats_threshold: number;
    employee_count: number;
    project_count: number;
    application_count: number;
    active_subscription_value_inr: number | null;
  }>;
  const activeCount = companies.filter((company) => company.status === "active").length;
  const pendingCount = companies.filter((company) => company.status === "pending").length;
  const pausedCount = companies.filter((company) => company.status === "paused").length;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Companies</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Register companies and monitor their current platform health.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active"
          value={String(activeCount)}
          hint="Companies currently live"
        />
        <MetricCard
          label="Pending"
          value={String(pendingCount)}
          hint="Awaiting activation"
        />
        <MetricCard
          label="Paused"
          value={String(pausedCount)}
          hint="Temporarily on hold"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Company Directory</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Employees</th>
                  <th className="pb-3 pr-4">Projects</th>
                  <th className="pb-3 pr-4">Applications</th>
                  <th className="pb-3 pr-4">ATS</th>
                  <th className="pb-3 pr-4">Plan Value</th>
                  <th className="pb-3 pr-4">Details</th>
                  <th className="pb-3 pr-4">Edit</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const amount = new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(Number(company.active_subscription_value_inr ?? 0));
                  const details = companyDetails.get(company.id);

                  return (
                    <tr key={company.id} className="border-t border-slate-200/70 align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-slate-500">{company.code}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                            company.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : company.status === "paused"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {company.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{company.employee_count}</td>
                      <td className="py-3 pr-4">{company.project_count}</td>
                      <td className="py-3 pr-4">{company.application_count}</td>
                      <td className="py-3 pr-4">{company.ats_threshold}%</td>
                      <td className="py-3 pr-4">{amount}</td>
                      <td className="py-3 pr-4">
                        <CompanyDirectoryModal
                          company={{
                            name: company.name,
                            code: company.code,
                            status: company.status,
                            atsThreshold: company.ats_threshold,
                            employeeCount: company.employee_count,
                            projectCount: company.project_count,
                            applicationCount: company.application_count,
                            planValue: amount,
                          }}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <details className="min-w-[320px] rounded-[18px] border border-slate-200 bg-white p-3">
                          <summary className="cursor-pointer font-semibold text-slate-700">Edit</summary>
                          <form action={updateCompanyAction} className="mt-4 space-y-3">
                            <input type="hidden" name="companyId" value={company.id} />
                            <input type="hidden" name="redirectTo" value="/dashboard/superadmin/companies" />
                            <input className="input-base" name="name" defaultValue={company.name} required />
                            <input className="input-base" name="code" defaultValue={company.code} required />
                            <input
                              className="input-base"
                              type="email"
                              name="contactEmail"
                              defaultValue={details?.contact_email ?? ""}
                              required
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                className="input-base"
                                type="number"
                                name="atsThreshold"
                                min="1"
                                max="100"
                                defaultValue={company.ats_threshold}
                                required
                              />
                              <select className="input-base" name="status" defaultValue={company.status}>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                              </select>
                            </div>
                            <textarea className="input-base min-h-20" name="notes" defaultValue={details?.notes ?? ""} />
                            <button className="button-primary w-full" type="submit">
                              Update Company
                            </button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form action={createCompanyAction} className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Add Company</h3>
          <div className="mt-5 space-y-4">
            <input className="input-base" name="name" placeholder="Company name" />
            <input className="input-base" name="code" placeholder="Company code" />
            <input
              className="input-base"
              type="email"
              name="contactEmail"
              placeholder="Contact email"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className="input-base"
                type="number"
                name="atsThreshold"
                min="1"
                max="100"
                defaultValue="60"
                placeholder="ATS threshold"
              />
              <select className="input-base" name="status" defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <textarea
              className="input-base min-h-28"
              name="notes"
              placeholder="Internal notes"
            />
            <button className="button-primary w-full" type="submit">
              Save Company
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
