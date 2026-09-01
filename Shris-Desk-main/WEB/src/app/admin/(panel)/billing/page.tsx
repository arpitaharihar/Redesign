"use client";

import { useEffect, useState } from "react";

import { AdminPanelTopbar } from "@/components/admin-panel-topbar";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAdminGuard } from "@/lib/use-admin-guard";

type Subscription = {
  id: string;
  status: string;
  seats_purchased: number;
  price_override_inr: number | null;
  starts_on: string;
  ends_on: string | null;
  plan_id: string;
  subscription_plans?: { name?: string; billing_cycle?: string } | Array<{
    name?: string;
    billing_cycle?: string;
  }> | null;
};

export default function AdminBillingPage() {
  const { loading: guardLoading, profile } = useAdminGuard(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      if (!profile?.company_id) return;
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("company_subscriptions")
        .select(
          "id, status, seats_purchased, price_override_inr, starts_on, ends_on, plan_id, subscription_plans(name, billing_cycle)",
        )
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription((data ?? null) as Subscription | null);
    };

    if (profile?.company_id) {
      loadSubscription();
    }
  }, [profile?.company_id]);

  if (guardLoading) {
    return <div className="main-content px-4 py-4">Loading billing...</div>;
  }

  const planName = Array.isArray(subscription?.subscription_plans)
    ? subscription?.subscription_plans?.[0]?.name
    : subscription?.subscription_plans?.name;
  const billingCycle = Array.isArray(subscription?.subscription_plans)
    ? subscription?.subscription_plans?.[0]?.billing_cycle
    : subscription?.subscription_plans?.billing_cycle;

  return (
    <main className="main-content position-relative max-height-vh-100 h-100 border-radius-lg ">
      <AdminPanelTopbar title="Billing" breadcrumb="Billing" />
      <div className="container-fluid py-4">
        <div className="sd-hero">
          <div className="d-flex flex-column flex-lg-row justify-content-between">
            <div>
              <h3 className="mb-2">Billing Overview</h3>
              <p className="mb-0 text-white-50">
                Track subscription status, invoices, and payment methods.
              </p>
            </div>
            <button className="btn btn-light btn-sm mt-3 mt-lg-0">View Invoices</button>
          </div>
        </div>
        <div className="card">
          <div className="sd-card-header">
            <h6 className="text-white text-capitalize mb-0">Subscription Overview</h6>
          </div>
          <div className="card-body">
            {subscription ? (
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="card border">
                    <div className="card-body">
                      <p className="text-xs text-uppercase mb-1 text-secondary">Plan</p>
                      <h5 className="mb-0">{planName ?? "Custom Plan"}</h5>
                      <p className="text-sm text-muted">
                        {billingCycle ?? "Custom billing"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card border">
                    <div className="card-body">
                      <p className="text-xs text-uppercase mb-1 text-secondary">Seats</p>
                      <h5 className="mb-0">{subscription.seats_purchased}</h5>
                      <p className="text-sm text-muted">Allocated users</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card border">
                    <div className="card-body">
                      <p className="text-xs text-uppercase mb-1 text-secondary">Status</p>
                      <h5 className="mb-0 text-capitalize">{subscription.status}</h5>
                      <p className="text-sm text-muted">
                        Started {subscription.starts_on}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">No subscription details found yet.</p>
            )}
          </div>
        </div>
        <div className="row mt-4">
          <div className="col-lg-7">
            <div className="card">
              <div className="sd-card-header">
                <h6 className="text-white text-capitalize mb-0">Payment Method</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="card card-body border card-plain border-radius-lg d-flex align-items-center flex-row">
                      <img
                        className="w-10 me-3 mb-0"
                        src="/admin/img/logos/mastercard.png"
                        alt="logo"
                      />
                      <h6 className="mb-0">**** **** **** 7852</h6>
                      <i className="material-icons ms-auto text-dark cursor-pointer">edit</i>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card card-body border card-plain border-radius-lg d-flex align-items-center flex-row">
                      <img
                        className="w-10 me-3 mb-0"
                        src="/admin/img/logos/visa.png"
                        alt="logo"
                      />
                      <h6 className="mb-0">**** **** **** 5248</h6>
                      <i className="material-icons ms-auto text-dark cursor-pointer">edit</i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card mt-4">
              <div className="sd-card-header">
                <h6 className="text-white text-capitalize mb-0">Billing Information</h6>
              </div>
              <div className="card-body">
                <div className="list-group">
                  <div className="list-group-item border-0 mb-2 bg-gray-100 border-radius-lg">
                    <h6 className="mb-1 text-sm">Primary Billing Contact</h6>
                    <p className="mb-1 text-xs text-muted">Email: billing@smartdesk.com</p>
                    <p className="mb-0 text-xs text-muted">VAT: N/A</p>
                  </div>
                  <div className="list-group-item border-0 bg-gray-100 border-radius-lg">
                    <h6 className="mb-1 text-sm">Finance Contact</h6>
                    <p className="mb-1 text-xs text-muted">Email: finance@smartdesk.com</p>
                    <p className="mb-0 text-xs text-muted">VAT: N/A</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card h-100">
              <div className="sd-card-header">
                <h6 className="text-white text-capitalize mb-0">Recent Invoices</h6>
              </div>
              <div className="card-body">
                <ul className="list-group">
                  {[
                    { date: "March 01, 2026", id: "INV-415646", amount: "₹18,000" },
                    { date: "February 10, 2026", id: "INV-126749", amount: "₹25,000" },
                    { date: "January 05, 2026", id: "INV-212562", amount: "₹12,000" },
                  ].map((item) => (
                    <li
                      key={item.id}
                      className="list-group-item border-0 d-flex justify-content-between ps-0 mb-2 border-radius-lg"
                    >
                      <div className="d-flex flex-column">
                        <h6 className="mb-1 text-dark font-weight-bold text-sm">{item.date}</h6>
                        <span className="text-xs">{item.id}</span>
                      </div>
                      <div className="d-flex align-items-center text-sm">
                        {item.amount}
                        <button className="btn btn-link text-dark text-sm mb-0 px-0 ms-4">
                          <i className="material-icons text-lg position-relative me-1">
                            picture_as_pdf
                          </i>
                          PDF
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
