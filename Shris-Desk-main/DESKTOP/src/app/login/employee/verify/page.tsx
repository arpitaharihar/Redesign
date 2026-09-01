import { redirect } from "next/navigation";

import { EmployeeFaceVerifier } from "@/components/employee-face-verifier";
import { getEmployeeFaceChallenge } from "@/lib/face-auth";

type EmployeeFaceVerifyPageProps = {
  searchParams: Promise<{
    challenge?: string;
  }>;
};

export default async function EmployeeFaceVerifyPage({
  searchParams,
}: EmployeeFaceVerifyPageProps) {
  const params = await searchParams;

  if (!params.challenge) {
    redirect("/login/employee?error=Start+a+new+employee+face+login+session.");
  }

  const challenge = await getEmployeeFaceChallenge(params.challenge);

  if (!challenge) {
    redirect("/login/employee?error=The+employee+face+login+session+expired.+Start+again.");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10 md:px-10">
      <EmployeeFaceVerifier
        challengeToken={params.challenge}
        employeeLabel={challenge.fullName ?? challenge.email}
        companyLabel={
          challenge.companyName && challenge.companyCode
            ? `${challenge.companyName} (${challenge.companyCode})`
            : challenge.companyName ?? challenge.companyCode ?? "Assigned company"
        }
      />
    </main>
  );
}
