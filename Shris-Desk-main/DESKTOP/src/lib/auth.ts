import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase/server";
import type { AppRole, NavItem, ProfileSummary } from "./types";

export async function getCurrentProfile(): Promise<ProfileSummary | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        full_name,
        role,
        department,
        phone,
        job_title,
        employee_code,
        location,
        shift_name,
        joining_date,
        manager_name,
        emergency_contact,
        skills,
        face_enrolled,
        profile_completed,
        company_id,
        companies (
          name,
          code
        )
      `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      fullName: user.user_metadata?.full_name ?? null,
      role: "employee",
      department: null,
      phone: null,
      jobTitle: null,
      employeeCode: null,
      location: null,
      shiftName: null,
      joiningDate: null,
      managerName: null,
      emergencyContact: null,
      skills: null,
      faceEnrolled: false,
      profileCompleted: false,
      companyId: null,
      companyName: null,
      companyCode: null,
    };
  }

  const companyRecord = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies;

  return {
    id: profile.id as string,
    email: (profile.email as string | null) ?? user.email ?? "",
    fullName: (profile.full_name as string | null) ?? null,
    role: (profile.role as AppRole) ?? "employee",
    department: (profile.department as string | null) ?? null,
    phone: (profile.phone as string | null) ?? null,
    jobTitle: (profile.job_title as string | null) ?? null,
    employeeCode: (profile.employee_code as string | null) ?? null,
    location: (profile.location as string | null) ?? null,
    shiftName: (profile.shift_name as string | null) ?? null,
    joiningDate: (profile.joining_date as string | null) ?? null,
    managerName: (profile.manager_name as string | null) ?? null,
    emergencyContact: (profile.emergency_contact as string | null) ?? null,
    skills: (profile.skills as string | null) ?? null,
    faceEnrolled: Boolean(profile.face_enrolled),
    profileCompleted: Boolean(profile.profile_completed),
    companyId: (profile.company_id as string | null) ?? null,
    companyName: (companyRecord?.name as string | undefined) ?? null,
    companyCode: (companyRecord?.code as string | undefined) ?? null,
  };
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

type RequireEmployeeProfileOptions = {
  allowIncompleteOnboarding?: boolean;
};

export async function requireEmployeeProfile(
  options: RequireEmployeeProfileOptions = {},
) {
  const profile = await requireProfile();

  if (profile.role !== "employee" || !profile.companyId) {
    redirect("/dashboard");
  }

  if (
    !options.allowIncompleteOnboarding &&
    (!profile.profileCompleted || !profile.faceEnrolled)
  ) {
    redirect("/dashboard/employee/onboarding");
  }

  return profile;
}

export function roleHome(role: AppRole) {
  switch (role) {
    case "superadmin":
      return "/dashboard/superadmin";
    case "company_admin":
      return "/dashboard/company-admin";
    case "employee":
      return "/dashboard/employee";
    default:
      return "/dashboard";
  }
}

export function navItemsForRole(role: AppRole): NavItem[] {
  switch (role) {
    case "superadmin":
      return [
        { href: "/dashboard/superadmin", label: "Overview" },
        { href: "/dashboard/superadmin/companies", label: "Companies" },
        { href: "/dashboard/superadmin/analytics", label: "Analytics" },
        { href: "/dashboard/superadmin/billing", label: "Billing" },
        { href: "/dashboard/superadmin/access", label: "Access" },
        { href: "/dashboard/superadmin/feedback", label: "Feedback" },
      ];
    case "company_admin":
      return [
        { href: "/dashboard/company-admin", label: "Overview" },
        { href: "/dashboard/company-admin/employees", label: "Employees" },
        { href: "/dashboard/company-admin/projects", label: "Projects" },
        { href: "/dashboard/company-admin/tasks", label: "Tasks" },
        { href: "/dashboard/company-admin/analytics", label: "Analytics" },
        { href: "/dashboard/company-admin/applicants", label: "Applicants" },
        { href: "/dashboard/company-admin/hiring", label: "Hiring" },
        { href: "/dashboard/company-admin/feedback", label: "Feedback" },
      ];
    case "employee":
      return [
        { href: "/dashboard/employee", label: "Overview" },
        { href: "/dashboard/employee/analytics", label: "Analytics" },
        { href: "/dashboard/employee/projects", label: "Projects" },
        { href: "/dashboard/employee/tasks", label: "Tasks" },
        { href: "/dashboard/employee/chat", label: "Chat" },
        { href: "/dashboard/employee/meetings", label: "Meetings" },
        { href: "/dashboard/employee/settings", label: "Settings" },
      ];
    default:
      return [{ href: "/dashboard", label: "Dashboard" }];
  }
}
