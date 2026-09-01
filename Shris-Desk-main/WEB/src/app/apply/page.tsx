import Link from "next/link";

import { submitApplicationAction } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase";

type ApplyPageProps = {
  searchParams: Promise<{ error?: string; company?: string }>;
};

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
  const params = await searchParams;
  const supabase = createSupabaseServerClient();
  const companyCode =
    (params.company || process.env.NEXT_PUBLIC_COMPANY_CODE || "").toUpperCase();

  const { data: company } = companyCode
    ? await supabase.rpc("get_company_public", { company_code: companyCode }).maybeSingle()
    : { data: null };

  const { data: openings } = company
    ? await supabase
        .from("job_openings")
        .select("id, title, department, min_ats_score, status")
        .eq("company_id", company.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 py-5">
      <div className="card p-4 w-100" style={{ maxWidth: "720px" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Apply for a Role</h2>
          <Link href="/" className="btn btn-outline-secondary btn-sm">
            Back to Home
          </Link>
        </div>

        {params.error ? (
          <div className="alert alert-danger">{params.error}</div>
        ) : null}

        {!company ? (
          <div className="alert alert-warning">
            Company code is missing. Set `NEXT_PUBLIC_COMPANY_CODE` in this web app before
            accepting applications.
          </div>
        ) : null}
        {company && (openings ?? []).length === 0 ? (
          <div className="alert alert-info">
            No published openings yet. Please check back soon.
          </div>
        ) : null}

        <form action={submitApplicationAction}>
          <input type="hidden" name="companyCode" value={companyCode} />

          <div className="mb-3">
            <label className="form-label">Select Role</label>
            <select className="form-select" name="openingId" required>
              <option value="">Choose opening</option>
              {(openings ?? []).map((opening) => (
                <option key={opening.id} value={opening.id}>
                  {opening.title} {opening.department ? `(${opening.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Full Name</label>
            <input className="form-control" name="fullName" placeholder="Your full name" required />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              name="email"
              placeholder="name@email.com"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Address</label>
            <input className="form-control" name="address" placeholder="City, State" required />
          </div>

          <div className="mb-3 row">
            <div className="col-md-4">
              <label className="form-label">Country Code</label>
              <input className="form-control" name="countryCode" placeholder="+91" required />
            </div>
            <div className="col-md-8">
              <label className="form-label">Contact</label>
              <input className="form-control" name="contact" placeholder="Phone number" required />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Resume Link (PDF)</label>
            <input
              className="form-control"
              name="resumeLink"
              placeholder="https://..."
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Cover Letter</label>
            <textarea className="form-control" name="coverLetter" rows={5} required />
          </div>

          <button type="submit" className="btn btn-primary w-100">
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}
