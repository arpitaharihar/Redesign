type SectionCardProps = {
  title: string;
  lines: string[];
  emptyMessage?: string;
};

export function SectionCard({ title, lines, emptyMessage = "No updates yet." }: SectionCardProps) {
  return (
    <article className="panel-strong rounded-[26px] p-5">
      <h3 className="text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
        {lines.length === 0 ? (
          <p className="text-sm leading-7 text-slate-500">{emptyMessage}</p>
        ) : (
          lines.map((line) => <p key={line}>{line}</p>)
        )}
      </div>
    </article>
  );
}
