import { redirect } from "next/navigation";

import { MetricCard } from "@/components/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createCompanyFeedbackAction } from "../actions";

type CompanyAdminFeedbackPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function CompanyAdminFeedbackPage({
  searchParams,
}: CompanyAdminFeedbackPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "company_admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const reviewsResult = profile.companyId
    ? await supabase
        .from("reviews")
        .select("id, reviewer_name, feedback_type, rating, note, created_at")
        .eq("company_id", profile.companyId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const reviews = (reviewsResult.data ?? []) as Array<{
    id: string;
    reviewer_name: string;
    feedback_type: string;
    rating: number;
    note: string;
    created_at: string;
  }>;
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Feedback</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Send company feedback to the SmartDesk superadmin team.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Feedback Sent" value={String(reviews.length)} hint="Company feedback items" />
        <MetricCard label="Average Rating" value={`${averageRating}/5`} hint="Recent company sentiment" />
        <MetricCard label="Company" value={profile.companyCode ?? "NA"} hint={profile.companyName ?? "Assigned company"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={createCompanyFeedbackAction} className="panel-strong rounded-[30px] p-6">
          <input type="hidden" name="redirectTo" value="/dashboard/company-admin/feedback" />
          <h3 className="section-title">Add Feedback</h3>
          <div className="mt-5 space-y-4">
            <input className="input-base" name="reviewerName" defaultValue={profile.fullName ?? ""} placeholder="Reviewer name" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="input-base" name="feedbackType" placeholder="Feedback type" required />
              <select className="input-base" name="rating" defaultValue="5" required>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <textarea className="input-base min-h-32" name="note" placeholder="Feedback for superadmin" required />
            <button className="button-primary w-full" type="submit" disabled={!profile.companyId}>
              Submit Feedback
            </button>
          </div>
        </form>

        <section className="panel rounded-[30px] p-6">
          <h3 className="section-title">Feedback Timeline</h3>
          <div className="mt-5 max-h-[580px] space-y-4 overflow-y-auto pr-2">
            {reviews.length === 0 ? (
              <p className="text-sm leading-7 text-slate-500">No feedback submitted yet.</p>
            ) : null}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-[22px] border border-slate-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{review.feedback_type}</p>
                  <p className="text-sm font-semibold text-slate-600">{review.rating}/5</p>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{review.note}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                  {review.reviewer_name} |{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(review.created_at))}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
