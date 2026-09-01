import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/metric-card";

import { assignCompanyAdminAction } from "../actions";

type AccessPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

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

export default async function SuperadminAccessPage({ searchParams }: AccessPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [companiesResult, adminsResult, usersResult] = await Promise.all([
    supabase.from("companies").select("id, name, code").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email, created_at, company_id, companies(name, code)")
      .eq("role", "company_admin")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .neq("role", "superadmin")
      .order("email"),
  ]);

  const companies = (companiesResult.data ?? []) as Array<{
    id: string;
    name: string;
    code: string;
  }>;
  const admins = (adminsResult.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string;
    created_at: string;
    company_id: string | null;
    companies?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
  }>;
  const users = (usersResult.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    email: string;
    role: string;
  }>;
  const unassignedAdmins = admins.filter((admin) => !admin.company_id).length;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Access</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Assign and review company admin access across the platform.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Company Admins"
          value={String(admins.length)}
          hint="Active admin accounts"
        />
        <MetricCard
          label="Unassigned"
          value={String(unassignedAdmins)}
          hint="Admins without a company"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Company Admin Directory</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3 pr-4">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const company = Array.isArray(admin.companies)
                    ? admin.companies[0]
                    : admin.companies;

                  return (
                    <tr key={admin.id} className="border-t border-slate-200/70">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{admin.full_name ?? admin.email}</div>
                        <div className="text-xs text-slate-500">{admin.email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {company?.name ?? "Unassigned"}
                        <div className="text-xs text-slate-500">{company?.code ?? "NA"}</div>
                      </td>
                      <td className="py-3 pr-4">{formatDate(admin.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form action={assignCompanyAdminAction} className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Assign Company Admin</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Promote an existing user account into a company admin and map it to the
            correct company.
          </p>
          <div className="mt-5 space-y-4">
            <select className="input-base" name="email" defaultValue="" required>
              <option value="" disabled>
                Select existing user email
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.email}>
                  {user.email} | {user.full_name ?? "Unnamed"} | {user.role.replace("_", " ")}
                </option>
              ))}
            </select>
            <input className="input-base" name="fullName" placeholder="Full name (optional)" />
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
            <button className="button-primary w-full" type="submit">
              Assign Access
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
