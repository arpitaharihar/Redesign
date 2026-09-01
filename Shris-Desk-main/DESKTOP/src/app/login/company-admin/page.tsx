import Link from "next/link";

import { StatusBanner } from "@/components/status-banner";

import { signInAction } from "../actions";

type CompanyAdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminLoginPage({
  searchParams,
}: CompanyAdminLoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 md:px-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-[34px] p-8 md:p-10">
          <span className="eyebrow">Company Admin Login</span>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
            Sign in to run your company workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
            Company Admin can now access employees, projects, tasks, and hiring from
            a single workspace.
          </p>

          <div className="mt-8">
            <StatusBanner error={params.error} success={params.success} />
          </div>

          <form action={signInAction} className="mt-8 panel-strong rounded-[30px] p-6">
            <input type="hidden" name="redirectTo" value="/login/company-admin" />
            <input type="hidden" name="expectedRole" value="company_admin" />

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input className="input-base" type="email" name="email" placeholder="Enter email" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  className="input-base"
                  type="password"
                  name="password"
                  placeholder="Enter password"
                />
              </div>

              <button className="button-primary w-full" type="submit">
                Login To Company Admin
              </button>
            </div>
          </form>
        </section>

        <aside className="panel-strong rounded-[34px] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Current Scope
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
            <p>Employee and access visibility</p>
            <p>Project and task management</p>
            <p>Job openings and application review</p>
            <p>Company-level operational overview</p>
          </div>

          <div className="mt-8 rounded-[28px] bg-slate-950 p-6 text-slate-100">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Provisioning
            </p>
            <p className="mt-3 text-base leading-7">
              A Superadmin must assign the user to a company and promote the account
              to Company Admin access before login will work here.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="button-secondary" href="/login">
              View All Logins
            </Link>
            <Link className="button-secondary" href="/">
              Back To Welcome
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
