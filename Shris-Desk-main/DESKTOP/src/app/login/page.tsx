import Link from "next/link";

import { AuthSessionRedirect } from "@/components/auth-session-redirect";
import { PortalEntryCard } from "@/components/portal-entry-card";
import { StatusBanner } from "@/components/status-banner";
import { portalOptions } from "@/lib/portal-options";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      <section className="panel relative overflow-hidden rounded-[40px] px-10 py-12 md:px-14 md:py-14">
        <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.12),transparent_70%)]" />
        <div className="relative flex flex-col gap-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="max-w-3xl space-y-5">
              <span className="eyebrow">Portal Login</span>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 md:text-6xl">
                Select the role that fits your workspace authority.
              </h1>
              <p className="text-base leading-8 text-slate-700 md:text-lg">
                Sign in with the exact portal assigned to you. Company and Superadmin
                access are live now, while employee access follows the same structure.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Security</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                Enforced role access
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Each portal uses dedicated credentials and verification layers for
                onboarding, hiring, and admin control.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  MFA-ready
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Face login
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Audit logs
                </span>
              </div>
            </div>
          </div>

          <AuthSessionRedirect />
          <StatusBanner error={params.error} success={params.success} />

          <div className="grid gap-5 lg:grid-cols-3">
            {portalOptions.map((option) => (
              <PortalEntryCard key={option.title} option={option} />
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <Link className="button-primary" href="/login/superadmin">
              Continue To Superadmin
            </Link>
            <Link className="button-secondary" href="/">
              Back To Welcome Page
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
