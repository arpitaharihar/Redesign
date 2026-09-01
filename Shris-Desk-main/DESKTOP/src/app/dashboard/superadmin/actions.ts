"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const companySchema = z.object({
  name: z.string().trim().min(2),
  code: z
    .string()
    .trim()
    .min(2)
    .transform((value) => value.toUpperCase().replace(/\s+/g, "_")),
  contactEmail: z.string().email(),
  atsThreshold: z.coerce.number().int().min(1).max(100),
  status: z.enum(["active", "paused", "pending"]),
  notes: z.string().trim().optional(),
});

const companyUpdateSchema = companySchema.extend({
  companyId: z.string().uuid(),
  redirectTo: z.string().min(1).optional(),
});

const subscriptionSchema = z.object({
  companyId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(["trial", "active", "paused", "expired"]),
  seatsPurchased: z.coerce.number().int().min(1),
  startsOn: z.string().min(1),
  endsOn: z.string().optional(),
  priceOverrideInr: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? Number(value) : null)),
});

const planSchema = z.object({
  name: z.string().trim().min(2),
  billingCycle: z.string().trim().min(2),
  billingMode: z.string().trim().min(2),
  basePriceInr: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0),
  description: z.string().trim().optional(),
});

const planUpdateSchema = planSchema.extend({
  planId: z.string().uuid(),
  isActive: z.coerce.boolean().optional(),
  redirectTo: z.string().min(1).optional(),
});

const pricingRuleSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(6),
  basePriceInr: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0),
});

const pricingRuleUpdateSchema = pricingRuleSchema.extend({
  ruleId: z.string().uuid(),
  isActive: z.coerce.boolean().optional(),
  redirectTo: z.string().min(1).optional(),
});

const companyAdminSchema = z.object({
  email: z.string().email(),
  companyId: z.string().uuid(),
  fullName: z.string().trim().optional(),
});

const reviewSchema = z.object({
  companyId: z.string().uuid(),
  reviewerName: z.string().trim().min(2),
  feedbackType: z.string().trim().min(2),
  rating: z.coerce.number().int().min(1).max(5),
  note: z.string().trim().min(10),
});

function redirectWithResult(type: "error" | "success", message: string): never {
  redirect(`/dashboard/superadmin?${type}=${encodeURIComponent(message)}`);
}

function redirectToPathWithResult(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function createCompanyAction(formData: FormData) {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    contactEmail: formData.get("contactEmail"),
    atsThreshold: formData.get("atsThreshold"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid company details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("companies").insert({
    name: parsed.data.name,
    code: parsed.data.code,
    contact_email: parsed.data.contactEmail,
    ats_threshold: parsed.data.atsThreshold,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Company created successfully.");
}

export async function updateCompanyAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") || "/dashboard/superadmin/companies");
  const parsed = companyUpdateSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    code: formData.get("code"),
    contactEmail: formData.get("contactEmail"),
    atsThreshold: formData.get("atsThreshold"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
    redirectTo,
  });

  if (!parsed.success) {
    redirectToPathWithResult(redirectTo, "error", "Enter valid company details before updating.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      code: parsed.data.code,
      contact_email: parsed.data.contactEmail,
      ats_threshold: parsed.data.atsThreshold,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.companyId);

  if (error) {
    redirectToPathWithResult(redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  revalidatePath("/dashboard/superadmin/companies");
  redirectToPathWithResult(redirectTo, "success", "Company updated successfully.");
}

export async function createSubscriptionAction(formData: FormData) {
  const parsed = subscriptionSchema.safeParse({
    companyId: formData.get("companyId"),
    planId: formData.get("planId"),
    status: formData.get("status"),
    seatsPurchased: formData.get("seatsPurchased"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn") || undefined,
    priceOverrideInr: formData.get("priceOverrideInr") || undefined,
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid subscription details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("company_subscriptions").insert({
    company_id: parsed.data.companyId,
    plan_id: parsed.data.planId,
    status: parsed.data.status,
    seats_purchased: parsed.data.seatsPurchased,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn || null,
    price_override_inr: parsed.data.priceOverrideInr,
  });

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Subscription saved successfully.");
}

export async function createPlanAction(formData: FormData) {
  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    billingCycle: formData.get("billingCycle"),
    billingMode: formData.get("billingMode"),
    basePriceInr: formData.get("basePriceInr"),
    sortOrder: formData.get("sortOrder"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid plan details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("subscription_plans").insert({
    name: parsed.data.name,
    billing_cycle: parsed.data.billingCycle,
    billing_mode: parsed.data.billingMode,
    base_price_inr: parsed.data.basePriceInr,
    sort_order: parsed.data.sortOrder,
    description: parsed.data.description || null,
  });

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Subscription plan created successfully.");
}

export async function updatePlanAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") || "/dashboard/superadmin/billing");
  const parsed = planUpdateSchema.safeParse({
    planId: formData.get("planId"),
    name: formData.get("name"),
    billingCycle: formData.get("billingCycle"),
    billingMode: formData.get("billingMode"),
    basePriceInr: formData.get("basePriceInr"),
    sortOrder: formData.get("sortOrder"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") === "on",
    redirectTo,
  });

  if (!parsed.success) {
    redirectToPathWithResult(redirectTo, "error", "Enter valid plan details before updating.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({
      name: parsed.data.name,
      billing_cycle: parsed.data.billingCycle,
      billing_mode: parsed.data.billingMode,
      base_price_inr: parsed.data.basePriceInr,
      sort_order: parsed.data.sortOrder,
      description: parsed.data.description || null,
      is_active: parsed.data.isActive ?? false,
    })
    .eq("id", parsed.data.planId);

  if (error) {
    redirectToPathWithResult(redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  revalidatePath("/dashboard/superadmin/billing");
  redirectToPathWithResult(redirectTo, "success", "Subscription plan updated.");
}

export async function createPricingRuleAction(formData: FormData) {
  const parsed = pricingRuleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basePriceInr: formData.get("basePriceInr"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid pricing rule details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("pricing_rules").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    base_price_inr: parsed.data.basePriceInr,
    sort_order: parsed.data.sortOrder,
  });

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Pricing rule created successfully.");
}

export async function updatePricingRuleAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") || "/dashboard/superadmin/billing");
  const parsed = pricingRuleUpdateSchema.safeParse({
    ruleId: formData.get("ruleId"),
    name: formData.get("name"),
    description: formData.get("description"),
    basePriceInr: formData.get("basePriceInr"),
    sortOrder: formData.get("sortOrder"),
    isActive: formData.get("isActive") === "on",
    redirectTo,
  });

  if (!parsed.success) {
    redirectToPathWithResult(redirectTo, "error", "Enter valid pricing rule details before updating.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("pricing_rules")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      base_price_inr: parsed.data.basePriceInr,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive ?? false,
    })
    .eq("id", parsed.data.ruleId);

  if (error) {
    redirectToPathWithResult(redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  revalidatePath("/dashboard/superadmin/billing");
  redirectToPathWithResult(redirectTo, "success", "Pricing rule updated.");
}

export async function assignCompanyAdminAction(formData: FormData) {
  const parsed = companyAdminSchema.safeParse({
    email: formData.get("email"),
    companyId: formData.get("companyId"),
    fullName: formData.get("fullName") || undefined,
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid access details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (profileError) {
    redirectWithResult("error", profileError.message);
  }

  if (!profile) {
    redirectWithResult("error", "No user profile exists for that email yet.");
  }

  const updateData: {
    role: "company_admin";
    company_id: string;
    full_name?: string;
  } = {
    role: "company_admin",
    company_id: parsed.data.companyId,
  };

  if (parsed.data.fullName) {
    updateData.full_name = parsed.data.fullName;
  }

  const { error } = await supabase.from("profiles").update(updateData).eq("id", profile.id);

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Company admin access assigned successfully.");
}

export async function createReviewAction(formData: FormData) {
  const parsed = reviewSchema.safeParse({
    companyId: formData.get("companyId"),
    reviewerName: formData.get("reviewerName"),
    feedbackType: formData.get("feedbackType"),
    rating: formData.get("rating"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirectWithResult("error", "Enter valid feedback details before saving.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").insert({
    company_id: parsed.data.companyId,
    reviewer_name: parsed.data.reviewerName,
    feedback_type: parsed.data.feedbackType,
    rating: parsed.data.rating,
    note: parsed.data.note,
  });

  if (error) {
    redirectWithResult("error", error.message);
  }

  revalidatePath("/dashboard/superadmin");
  redirectWithResult("success", "Feedback saved successfully.");
}
