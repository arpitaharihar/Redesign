import { notFound } from "next/navigation";

import SuperadminAccessPage from "../access/page";
import SuperadminAnalyticsPage from "../analytics/page";
import SuperadminBillingPage from "../billing/page";
import SuperadminCompaniesPage from "../companies/page";
import SuperadminFeedbackPage from "../feedback/page";

type SuperadminSectionPageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const sectionMap = {
  access: SuperadminAccessPage,
  analytics: SuperadminAnalyticsPage,
  billing: SuperadminBillingPage,
  companies: SuperadminCompaniesPage,
  feedback: SuperadminFeedbackPage,
} as const;

export default async function SuperadminSectionPage({
  params,
  searchParams,
}: SuperadminSectionPageProps) {
  const { section } = await params;
  const handler = sectionMap[section as keyof typeof sectionMap];

  if (!handler) {
    notFound();
  }

  return handler({ searchParams });
}
