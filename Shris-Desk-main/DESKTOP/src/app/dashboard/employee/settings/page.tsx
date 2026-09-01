import Link from "next/link";

import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";

import { updateEmployeeSettingsAction } from "../actions";

type EmployeeSettingsPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EmployeeSettingsPage({
  searchParams,
}: EmployeeSettingsPageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Settings</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Update your employee profile settings.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <form action={updateEmployeeSettingsAction} className="panel-strong rounded-[30px] p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input
              className="input-base"
              name="fullName"
              defaultValue={profile.fullName ?? ""}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
            <input
              className="input-base"
              name="department"
              defaultValue={profile.department ?? ""}
              placeholder="Department"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Job title</label>
            <input
              className="input-base"
              name="jobTitle"
              defaultValue={profile.jobTitle ?? ""}
              placeholder="Job title"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Employee code</label>
            <input
              className="input-base"
              name="employeeCode"
              defaultValue={profile.employeeCode ?? ""}
              placeholder="Employee code"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <input
              className="input-base"
              name="phone"
              defaultValue={profile.phone ?? ""}
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Location</label>
            <input
              className="input-base"
              name="location"
              defaultValue={profile.location ?? ""}
              placeholder="Work location"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Shift</label>
            <input
              className="input-base"
              name="shiftName"
              defaultValue={profile.shiftName ?? ""}
              placeholder="Shift name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Joining date</label>
            <input
              className="input-base"
              type="date"
              name="joiningDate"
              defaultValue={profile.joiningDate ?? ""}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Manager</label>
            <input
              className="input-base"
              name="managerName"
              defaultValue={profile.managerName ?? ""}
              placeholder="Reporting manager"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Emergency contact</label>
            <input
              className="input-base"
              name="emergencyContact"
              defaultValue={profile.emergencyContact ?? ""}
              placeholder="Emergency contact"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">Skills</label>
          <textarea
            className="input-base min-h-24"
            name="skills"
            defaultValue={profile.skills ?? ""}
            placeholder="Core skills, tools, certifications"
          />
        </div>

        <div className="mt-6 rounded-[22px] border border-slate-200/80 bg-white px-4 py-4">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="profileCompleted"
              defaultChecked={profile.profileCompleted}
            />
            Mark profile as complete
          </label>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            Face login status is currently {profile.faceEnrolled ? "enabled" : "pending"}.
          </p>
        </div>

        <button className="button-primary mt-6 w-full sm:w-auto" type="submit">
          Save Settings
        </button>
      </form>

      <section className="panel-strong rounded-[30px] p-6">
        <h3 className="section-title">Face Recognition</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Face authentication is managed through the secure onboarding flow. Use
          re-enrollment if the employee needs to refresh the registered face template.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
              profile.faceEnrolled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {profile.faceEnrolled ? "Enrolled" : "Not Enrolled"}
          </span>
          <Link className="button-secondary" href="/dashboard/employee/onboarding?refresh=1">
            {profile.faceEnrolled ? "Re-enroll Face" : "Open Secure Setup"}
          </Link>
        </div>
      </section>
    </div>
  );
}
