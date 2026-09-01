import Link from "next/link";

export default function OfferLetterPage() {
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card shadow p-4" style={{ maxWidth: "720px", width: "100%" }}>
        <h2 className="text-center mb-3">Offer Letter</h2>
        <p>
          Congratulations! If you have been selected, you will receive your offer letter here.
        </p>
        <p className="text-muted">
          Please keep your application ID handy and check back once HR marks your offer as ready.
        </p>
        <Link href="/" className="btn btn-outline-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
