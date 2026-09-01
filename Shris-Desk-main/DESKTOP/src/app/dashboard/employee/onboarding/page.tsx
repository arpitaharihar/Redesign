import { redirect } from "next/navigation";

import { EmployeeFaceOnboarding } from "@/components/employee-face-onboarding";
import { requireEmployeeProfile } from "@/lib/auth";

type EmployeeOnboardingPageProps = {
  searchParams: Promise<{
    refresh?: string;
  }>;
};

export default async function EmployeeOnboardingPage({
  searchParams,
}: EmployeeOnboardingPageProps) {
  const params = await searchParams;
  const profile = await requireEmployeeProfile({
    allowIncompleteOnboarding: true,
  });
  const allowRefresh = params.refresh === "1";

  if (profile.profileCompleted && profile.faceEnrolled && !allowRefresh) {
    redirect("/dashboard/employee");
  }

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Secure Employee Onboarding</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
          Complete your profile and register face authentication
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          SmartDesk keeps the employee workspace locked until the profile is complete
          and the employee face template is registered with multiple guided angles.
        </p>
      </section>

      <EmployeeFaceOnboarding
        initialFullName={profile.fullName ?? ""}
        initialDepartment={profile.department ?? ""}
        initialPhone={profile.phone ?? ""}
        initialJobTitle={profile.jobTitle ?? ""}
        initialEmployeeCode={profile.employeeCode ?? ""}
        initialLocation={profile.location ?? ""}
        initialShiftName={profile.shiftName ?? ""}
        initialJoiningDate={profile.joiningDate ?? ""}
        initialManagerName={profile.managerName ?? ""}
        initialEmergencyContact={profile.emergencyContact ?? ""}
        initialSkills={profile.skills ?? ""}
        allowRefresh={allowRefresh}
      />
    </div>
  );
}
