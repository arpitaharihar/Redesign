import { notFound } from "next/navigation";

import EmployeeChatPage from "../chat/page";
import EmployeeMeetingsPage from "../meetings/page";
import EmployeeProjectsPage from "../projects/page";
import EmployeeSettingsPage from "../settings/page";
import EmployeeTasksPage from "../tasks/page";

type EmployeeSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    conversation?: string;
    meeting?: string;
    room?: string;
    error?: string;
    success?: string;
  }>;
};

const sectionMap = {
  chat: EmployeeChatPage,
  meetings: EmployeeMeetingsPage,
  projects: EmployeeProjectsPage,
  settings: EmployeeSettingsPage,
  tasks: EmployeeTasksPage,
} as const;

export default async function EmployeeSectionPage({
  params,
  searchParams,
}: EmployeeSectionPageProps) {
  const { section } = await params;
  const handler = sectionMap[section as keyof typeof sectionMap];

  if (!handler) {
    notFound();
  }

  return handler({ searchParams });
}
