"use client";

import { useState } from "react";

type ResumeModalProps = {
  url: string;
  label?: string;
};

export function ResumeModal({ url, label = "View Resume" }: ResumeModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-sm font-semibold text-slate-700 underline"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-700">Resume Preview</p>
              <button
                type="button"
                className="text-sm font-semibold text-slate-600"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="h-[70vh] w-full">
              <iframe
                src={url}
                title="Resume preview"
                className="h-full w-full rounded-b-2xl border-0"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
