type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="metric-card p-5">
      <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{hint}</p>
    </article>
  );
}
