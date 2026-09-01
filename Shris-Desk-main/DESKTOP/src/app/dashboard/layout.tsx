import { redirect } from "next/navigation";
import Link from "next/link";

import { navItemsForRole, requireProfile, roleHome } from "@/lib/auth";
import { RoleSidebar } from "@/components/role-sidebar";

async function logoutAction() {
  "use server";

  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login?success=Signed+out");
}

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  const onboardingLocked =
    profile.role === "employee" && (!profile.profileCompleted || !profile.faceEnrolled);
  const navItems = onboardingLocked
    ? [{ href: "/dashboard/employee/onboarding", label: "Secure Onboarding" }]
    : navItemsForRole(profile.role);
  const homeHref = onboardingLocked
    ? "/dashboard/employee/onboarding"
    : roleHome(profile.role);

  return (
    <div className="min-h-screen">
      <aside className="panel hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen lg:w-[290px] lg:flex-col lg:rounded-none lg:border-r lg:border-l-0 lg:border-t-0 lg:border-b-0 lg:px-5 lg:py-6">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
            {profile.role.replace("_", " ")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {profile.fullName ?? profile.email}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {profile.companyName
              ? `${profile.companyName} (${profile.companyCode})`
              : "Platform-level access"}
          </p>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <RoleSidebar items={navItems} />
        </div>

        <div className="mt-6 space-y-3">
          <Link className="button-secondary w-full" href={homeHref}>
            Role Home
          </Link>
          <form action={logoutAction}>
            <button className="button-primary w-full" type="submit">
              Log Out
            </button>
          </form>
        </div>
      </aside>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8 md:px-10 lg:max-w-none lg:pl-[322px] lg:pr-8">
        <div className="panel rounded-[30px] px-6 py-5 lg:hidden">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
              {profile.role.replace("_", " ")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
              {profile.fullName ?? profile.email}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {profile.companyName
                ? `${profile.companyName} (${profile.companyCode})`
                : "Platform-level access"}
            </p>
          </div>

          <div className="mt-5">
            <RoleSidebar items={navItems} />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link className="button-secondary" href={homeHref}>
              Role Home
            </Link>
            <form action={logoutAction}>
              <button className="button-primary w-full sm:w-auto" type="submit">
                Log Out
              </button>
            </form>
          </div>
        </div>

        <section>{children}</section>
      </main>
    </div>
  );
}
