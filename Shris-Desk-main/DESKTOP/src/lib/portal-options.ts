export type PortalOption = {
  title: string;
  href: string;
  availability: string;
  description: string;
  helper: string;
  live: boolean;
};

export const portalOptions: PortalOption[] = [
  {
    title: "Superadmin",
    href: "/login/superadmin",
    availability: "Live now",
    description:
      "Control companies, platform pricing, admin access, payments, and operational feedback from one place.",
    helper: "This is the first complete flow in the rebuild.",
    live: true,
  },
  {
    title: "Company Admin",
    href: "/login/company-admin",
    availability: "Live now",
    description:
      "Manage your company workspace, employees, projects, tasks, and hiring activity inside SmartDesk.",
    helper: "Company operations are now available in the current release.",
    live: true,
  },
  {
    title: "Employee",
    href: "/login/employee",
    availability: "Live now",
    description:
      "Access your assigned work, project memberships, attendance, and profile tools from a single workspace.",
    helper: "Chat, meetings, tasks, projects, and settings are now part of the workspace.",
    live: true,
  },
];
