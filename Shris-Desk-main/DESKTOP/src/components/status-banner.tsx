import { clsx } from "clsx";

type StatusBannerProps = {
  error?: string;
  success?: string;
};

export function StatusBanner({ error, success }: StatusBannerProps) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={clsx(
        "rounded-[22px] border px-4 py-3 text-sm leading-7",
        error
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {error ?? success}
    </div>
  );
}
