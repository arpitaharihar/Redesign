import Link from "next/link";
import { redirect } from "next/navigation";

import { ResumeModal } from "@/components/resume-modal";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EmployeesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminEmployeesPage({
  searchParams,
}: EmployeesPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  let company: { name?: string | null; code?: string | null } | null = null;
  let employees: Array<{
    id: string;
    full_name: string | null;
    email: string;
    role: string;
    department: string | null;
    phone: string | null;
    job_title: string | null;
    employee_code: string | null;
    location: string | null;
    shift_name: string | null;
    joining_date: string | null;
    manager_name: string | null;
    emergency_contact: string | null;
    skills: string | null;
    face_enrolled: boolean;
    profile_completed: boolean;
    is_active: boolean;
  }> = [];
  let hiredApplicants: Array<{
    id: string;
    full_name: string;
    email: string;
    desired_role: string;
    created_at: string;
    resume_link: string;
  }> = [];

  if (profile.companyId) {
    const [companyResult, employeesResult, hiredResult] = await Promise.all([
      supabase
        .from("companies")
        .select("name, code")
        .eq("id", profile.companyId)
        .single(),
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, role, department, phone, job_title, employee_code, location, shift_name, joining_date, manager_name, emergency_contact, skills, face_enrolled, profile_completed, is_active",
        )
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_applications")
        .select("id, full_name, email, desired_role, created_at, resume_link")
        .eq("company_id", profile.companyId)
        .eq("status", "hired")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    company = companyResult.data;
    employees = (employeesResult.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string;
      role: string;
      department: string | null;
      phone: string | null;
      job_title: string | null;
      employee_code: string | null;
      location: string | null;
      shift_name: string | null;
      joining_date: string | null;
      manager_name: string | null;
      emergency_contact: string | null;
      skills: string | null;
      face_enrolled: boolean;
      profile_completed: boolean;
      is_active: boolean;
    }>;
    hiredApplicants = (hiredResult.data ?? []) as Array<{
      id: string;
      full_name: string;
      email: string;
      desired_role: string;
      created_at: string;
      resume_link: string;
    }>;
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Employees</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Team access and profile visibility for {company?.name ?? "your company"}
        </h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Review employee records, role assignments, profile completion, and biometric
          enrollment readiness.
        </p>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Assign a company to this admin profile before viewing the employee roster.
          </p>
        ) : null}
      </section>

      <section className="panel rounded-[30px] p-6">
        <div className="max-h-[560px] overflow-auto pr-2">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 pr-4">Work Details</th>
                <th className="pb-3 pr-4">Contact</th>
                <th className="pb-3 pr-4">Face Login</th>
                <th className="pb-3 pr-4">Profile</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Analytics</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-t border-slate-200/70">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{employee.full_name ?? employee.email}</div>
                    <div className="text-xs text-slate-500">{employee.email}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {employee.employee_code ?? "No code"} | {employee.role.replace("_", " ")}
                    </div>
                  </td>
                  <td className="min-w-64 py-3 pr-4">
                    <div className="font-medium">{employee.job_title ?? "Role not set"}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {employee.department ?? "Unassigned"} | {employee.shift_name ?? "Shift not set"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {employee.location ?? "Location not set"} | Joined{" "}
                      {employee.joining_date ?? "not set"}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {employee.skills ?? "Skills not added"}
                    </div>
                  </td>
                  <td className="min-w-52 py-3 pr-4">
                    <div>{employee.phone ?? "No phone"}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Manager: {employee.manager_name ?? "Not assigned"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Emergency: {employee.emergency_contact ?? "Not added"}
                    </div>
                  </td>
                  <td className="py-3 pr-4">{employee.face_enrolled ? "Enabled" : "Pending"}</td>
                  <td className="py-3 pr-4">
                    {employee.profile_completed ? "Complete" : "Pending"}
                  </td>
                  <td className="py-3 pr-4">{employee.is_active ? "Active" : "Inactive"}</td>
                  <td className="py-3 pr-4">
                    <Link
                      className="button-secondary"
                      href={`/dashboard/company-admin/analytics/${employee.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel rounded-[30px] p-6">
        <h3 className="section-title">Recent Hires (Applicants)</h3>
        <div className="mt-5 overflow-x-auto">
          {hiredApplicants.length === 0 ? (
            <p className="text-sm leading-7 text-slate-500">
              No hired applicants yet. Hire candidates from the hiring workflow to show them here.
            </p>
          ) : null}
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Candidate</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Resume</th>
              </tr>
            </thead>
            <tbody>
              {hiredApplicants.map((candidate) => (
                <tr key={candidate.id} className="border-t border-slate-200/70">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{candidate.full_name}</div>
                    <div className="text-xs text-slate-500">{candidate.email}</div>
                  </td>
                  <td className="py-3 pr-4">{candidate.desired_role}</td>
                  <td className="py-3 pr-4">
                    <ResumeModal url={candidate.resume_link} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
