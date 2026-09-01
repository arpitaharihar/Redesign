import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/status-banner";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/metric-card";

type FeedbackPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function SuperadminFeedbackPage({
  searchParams,
}: FeedbackPageProps) {
  const profile = await requireProfile();
  if (profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [reviewsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, reviewer_name, rating, feedback_type, note, created_at, companies(name, code)")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const reviews = (reviewsResult.data ?? []) as Array<{
    id: string;
    reviewer_name: string;
    rating: number;
    feedback_type: string;
    note: string;
    created_at: string;
    companies?: { name?: string; code?: string } | Array<{ name?: string; code?: string }> | null;
  }>;
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) / reviews.length).toFixed(1)
      : "0.0";
  const topRatings = reviews.filter((review) => review.rating >= 4).length;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Feedback</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          Track platform feedback and add new operational reviews.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Average Rating"
          value={`${averageRating}/5`}
          hint="Across recent feedback"
        />
        <MetricCard
          label="Top Reviews"
          value={String(topRatings)}
          hint="Ratings 4 and above"
        />
        <MetricCard
          label="Total Reviews"
          value={String(reviews.length)}
          hint="Captured in the platform"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel rounded-[30px] p-6">
          <h3 className="section-title">Recent Reviews</h3>
          <div className="mt-5 max-h-[620px] space-y-4 overflow-y-auto pr-2">
            {reviews.length === 0 ? (
              <p className="text-sm leading-7 text-slate-500">
                No feedback collected yet. Capture the first review on the right.
              </p>
            ) : null}
            {reviews.map((review) => {
              const company = Array.isArray(review.companies)
                ? review.companies[0]
                : review.companies;

              return (
                <article key={review.id} className="rounded-[24px] border border-slate-200/80 bg-white/75 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{review.reviewer_name}</p>
                      <p className="text-sm text-slate-500">
                        {company?.name ?? "Platform"} | {review.feedback_type}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {review.rating}/5
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{review.note}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {formatDate(review.created_at)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        {/* Feedback creation moved to company-admin feedback. Superadmin view is read-only. */}
        <aside className="panel-strong rounded-[30px] p-6">
          <h3 className="section-title">Feedback Intake</h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Company admins submit company feedback from their own feedback tab. Superadmin
            reviews the complete timeline here.
          </p>
        </aside>
      </section>
    </div>
  );
}
