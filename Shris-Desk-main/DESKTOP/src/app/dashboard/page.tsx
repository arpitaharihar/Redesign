import { redirect } from "next/navigation";

import { requireProfile, roleHome } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await requireProfile();
  redirect(roleHome(profile.role));
}
