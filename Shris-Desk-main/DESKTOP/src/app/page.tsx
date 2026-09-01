import Link from "next/link";

import { PortalEntryCard } from "@/components/portal-entry-card";
import { portalOptions } from "@/lib/portal-options";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
      <section className="panel relative overflow-hidden rounded-[40px] px-10 py-12 md:px-14 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#0f172a10,transparent_65%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(120deg,rgba(15,23,42,0.06),transparent)] lg:block" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="eyebrow">SmartDesk Desktop</span>
            <h1 className="text-5xl font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 md:text-7xl">
              One control room for every role in your workspace.
            </h1>
            {/* <p className="max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              Jump into the portal that matches your responsibilities and keep hiring,
              operations, and analytics in sync.
            </p> */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link className="button-primary" href="/login">
                Continue to Login
              </Link>
              <Link className="button-secondary" href="/login/superadmin">
                Superadmin Quick Access
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Portal status</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                  All admin roles
                </h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Active
              </span>
            </div>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <span>Company Admin dashboard ready for ATS and hiring.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                <span>Employee portal stays aligned for phase two launch.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                <span>Security layer active for face verification flows.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-10 grid gap-5 lg:grid-cols-3">
          {portalOptions.map((option) => (
            <PortalEntryCard key={option.title} option={option} />
          ))}
        </div>
      </section>
    </main>
  );
}
