import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function ApplySuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <h2 className="text-success text-center mb-3">Application Submitted Successfully!</h2>
        <p className="text-center">
          Thank you for applying. Our HR team will review your profile and get in touch within
          10 days if you are shortlisted.
        </p>
        <div className="d-flex justify-content-center">
          <div className="btn btn-primary mt-3">
            Your ID is : {params.id ?? "Pending"}
          </div>
        </div>
        <div className="text-center mt-3">
          <Link href="/" className="btn btn-outline-primary btn-sm">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
