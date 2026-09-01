import Link from "next/link";
import { clsx } from "clsx";

import type { PortalOption } from "@/lib/portal-options";

type PortalEntryCardProps = {
  option: PortalOption;
};

export function PortalEntryCard({ option }: PortalEntryCardProps) {
  return (
    <article
      className={clsx(
        "rounded-[28px] border p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition",
        option.live
          ? "border-slate-200/80 bg-white"
          : "border-slate-200/70 bg-white/70",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            {option.title}
          </p>
          {/* <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {option.availability}
          </h2> */}
        </div>
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
            option.live
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {option.live ? "Ready" : "Queued"}
        </span>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-600">{option.description}</p>
      {/* <p className="mt-4 text-sm leading-7 text-slate-500">{option.helper}</p> */}

      <Link
        href={option.href}
        className={clsx(
          "mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm text-white font-semibold transition",
          option.live
            ? "bg-slate-200  text-gray-100 hover:-translate-y-0.5"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        )}
        // className="button-primary"
      >
        {option.live ? `Open ${option.title} Login` : `View ${option.title} Login`}
      </Link>
    </article>
  );
}
