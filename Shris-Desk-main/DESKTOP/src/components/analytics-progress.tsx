type AnalyticsProgressProps = {
  label: string;
  value: number;
  subtitle: string;
  colorClass?: string;
};

export function AnalyticsProgress({
  label,
  value,
  subtitle,
  colorClass = "from-emerald-500 to-teal-600",
}: AnalyticsProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{clampedValue}%</p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </article>
  );
}
