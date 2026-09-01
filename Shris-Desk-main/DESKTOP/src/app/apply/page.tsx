import { submitApplicationAction } from "./actions";

type ApplyPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ApplyPage({ searchParams }: ApplyPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-6 py-10 md:px-10">
      <section className="panel w-full rounded-[34px] p-8 md:p-10">
        <span className="eyebrow">Hiring Intake</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
          Candidate application form
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
          This stores the candidate profile, target company, and ATS threshold
          context inside the new Supabase-backed system. Resume parsing and
          scoring automation can plug into this table next.
        </p>

        <form action={submitApplicationAction} className="mt-8 grid gap-4 md:grid-cols-2">
          <input className="input-base" type="text" name="fullName" placeholder="Full name" />
          <input className="input-base" type="email" name="email" placeholder="Email" />
          <input className="input-base" type="text" name="phone" placeholder="Phone number" />
          <input
            className="input-base"
            type="text"
            name="desiredRole"
            placeholder="Desired role"
          />
          <input
            className="input-base"
            type="text"
            name="companyCode"
            placeholder="Company code, e.g. NEXORA"
          />
          <input
            className="input-base"
            type="url"
            name="resumeLink"
            placeholder="Resume URL"
          />
          <textarea
            className="input-base md:col-span-2"
            name="coverLetter"
            placeholder="Brief cover letter or candidate summary"
            rows={6}
          />
          <button className="button-primary md:col-span-2" type="submit">
            Submit Application
          </button>
        </form>

        {(params.error || params.success) && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              params.error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {params.error ?? params.success}
          </div>
        )}
      </section>
    </main>
  );
}
