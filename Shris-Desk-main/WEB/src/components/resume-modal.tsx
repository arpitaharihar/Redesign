"use client";

import { useState } from "react";

type ResumeModalProps = {
  url: string;
};

export function ResumeModal({ url }: ResumeModalProps) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return <span className="text-muted">No resume</span>;
  }

  return (
    <>
      <button className="btn btn-outline-primary btn-sm" onClick={() => setOpen(true)}>
        View Resume
      </button>
      {open ? (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resume Preview</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                />
              </div>
              <div className="modal-body" style={{ height: "70vh" }}>
                <iframe
                  src={url}
                  title="Resume preview"
                  className="w-100 h-100 border-0"
                />
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
