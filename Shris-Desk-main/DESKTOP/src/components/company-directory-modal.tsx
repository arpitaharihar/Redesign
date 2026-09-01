"use client";

import { useState } from "react";

type CompanyDirectoryModalProps = {
  company: {
    name: string;
    code: string;
    status: string;
    atsThreshold: number;
    employeeCount: number;
    projectCount: number;
    applicationCount: number;
    planValue: string;
  };
};

export function CompanyDirectoryModal({ company }: CompanyDirectoryModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="button-secondary" type="button" onClick={() => setOpen(true)}>
        View
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <section className="panel-strong w-full max-w-xl rounded-[30px] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Company Details</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{company.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{company.code}</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Status", company.status],
                ["ATS Threshold", `${company.atsThreshold}%`],
                ["Employees", String(company.employeeCount)],
                ["Projects", String(company.projectCount)],
                ["Applications", String(company.applicationCount)],
                ["Plan Value", company.planValue],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </>
  );
}
