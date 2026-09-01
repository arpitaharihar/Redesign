import { notFound } from "next/navigation";

import CompanyAdminAnalyticsPage from "../analytics/page";
import CompanyApplicantsPage from "../applicants/page";
import CompanyAdminEmployeesPage from "../employees/page";
import CompanyAdminHiringPage from "../hiring/page";
import CompanyAdminProjectsPage from "../projects/page";

type CompanyAdminSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const sectionMap = {
  analytics: CompanyAdminAnalyticsPage,
  applicants: CompanyApplicantsPage,
  employees: CompanyAdminEmployeesPage,
  hiring: CompanyAdminHiringPage,
  projects: CompanyAdminProjectsPage,
} as const;

export default async function CompanyAdminSectionPage({
  params,
  searchParams,
}: CompanyAdminSectionPageProps) {
  const { section } = await params;
  const handler = sectionMap[section as keyof typeof sectionMap];

  if (!handler) {
    notFound();
  }

  return handler({ searchParams });
}
