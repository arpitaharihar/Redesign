export type AppRole = "superadmin" | "company_admin" | "employee";

export type ProfileSummary = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  department: string | null;
  phone: string | null;
  jobTitle: string | null;
  employeeCode: string | null;
  location: string | null;
  shiftName: string | null;
  joiningDate: string | null;
  managerName: string | null;
  emergencyContact: string | null;
  skills: string | null;
  faceEnrolled: boolean;
  profileCompleted: boolean;
  companyId: string | null;
  companyName: string | null;
  companyCode: string | null;
};

export type NavItem = {
  href: string;
  label: string;
};
