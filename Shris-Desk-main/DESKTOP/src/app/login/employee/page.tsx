import Link from "next/link";

import { AuthSessionRedirect } from "@/components/auth-session-redirect";
import { StatusBanner } from "@/components/status-banner";

import { signInAction } from "../actions";
import { beginEmployeeFaceLoginAction } from "./actions";

type EmployeeLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
    email?: string;
    companyCode?: string;
  }>;
};

export default async function EmployeeLoginPage({ searchParams }: EmployeeLoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 md:px-10">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-[34px] p-8 md:p-10">
          <span className="eyebrow">Employee Login</span>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-5xl">
            Secure employee access with mandatory face authentication.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
            First-time employee access uses password bootstrap for onboarding. Once
            secure setup is complete, SmartDesk requires face verification before the
            workspace is opened.
          </p>

          <div className="mt-8">
            <AuthSessionRedirect />
            <StatusBanner error={params.error} success={params.success} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <form
              action={beginEmployeeFaceLoginAction}
              className="panel-strong rounded-[30px] p-6"
            >
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Face Authentication
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use this for normal employee login after completing secure setup.
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Work Email
                  </label>
                  <input
                    className="input-base"
                    type="email"
                    name="email"
                    defaultValue={params.email ?? ""}
                    placeholder="employee@company.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Company Code
                  </label>
                  <input
                    className="input-base"
                    type="text"
                    name="companyCode"
                    defaultValue={params.companyCode ?? ""}
                    placeholder="COMP001"
                  />
                </div>

                <button className="button-primary w-full" type="submit">
                  Continue To Face Verification
                </button>
              </div>
            </form>

            <form action={signInAction} className="panel-strong rounded-[30px] p-6">
              <input type="hidden" name="redirectTo" value="/login/employee" />
              <input type="hidden" name="expectedRole" value="employee" />

              <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                First-Time Secure Setup
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use password login only if the employee has not completed profile and
                face registration yet.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    className="input-base"
                    type="email"
                    name="email"
                    defaultValue={params.email ?? ""}
                    placeholder="Enter email"
                  />
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

                <button className="button-secondary w-full" type="submit">
                  Start First-Time Setup
                </button>
              </div>
            </form>
          </div>
        </section>

        <aside className="panel-strong rounded-[34px] p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Enforcement Rules
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
            <p>Employee profile completion is mandatory</p>
            <p>Five-angle face registration is mandatory on first secure setup</p>
            <p>Future employee login is routed through face verification</p>
            <p>Workspace access stays blocked until both steps succeed</p>
          </div>

          <div className="mt-8 rounded-[28px] bg-slate-950 p-6 text-slate-100">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              Provisioning
            </p>
            <p className="mt-3 text-base leading-7">
              Employees must already exist in the company and be mapped to the
              correct company profile before signing in here. Company code is required
              for face-based login to prevent cross-company collisions.
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
