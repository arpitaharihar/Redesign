import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

// =========================
// Validation Schemas
// =========================

const uuidSchema = z.string().uuid("Invalid UUID");

const createApplicationSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  opening_id: z
    .string()
    .uuid("Invalid opening ID")
    .nullable()
    .optional(),

  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(1, "Phone is required"),
  desired_role: z.string().trim().min(1, "Desired role is required"),

  resume_link: z
    .string()
    .trim()
    .min(1, "Resume link is required"),

  cover_letter: z.string().trim().nullable().optional(),

  ats_score: z.number().min(0).max(100).optional(),

  ats_threshold_at_submission: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),

  ats_report: z.record(z.string(), z.any()).optional(),

  status: z.string().optional(),
});

const updateApplicationSchema = z.object({
  company_id: z.string().uuid("Invalid company ID").optional(),
  opening_id: z
    .string()
    .uuid("Invalid opening ID")
    .nullable()
    .optional(),

  full_name: z.string().trim().min(1).optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  phone: z.string().trim().min(1).optional(),
  desired_role: z.string().trim().min(1).optional(),

  resume_link: z.string().trim().min(1).optional(),

  cover_letter: z.string().trim().nullable().optional(),

  ats_score: z.number().min(0).max(100).optional(),

  ats_threshold_at_submission: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),

  ats_report: z.record(z.string(), z.any()).optional(),

  status: z.string().optional(),

  shortlisted_at: z.string().datetime().nullable().optional(),
  hired_at: z.string().datetime().nullable().optional(),
  rejected_at: z.string().datetime().nullable().optional(),
});

// =========================
// GET
// Get all applications
// Optional filters:
// ?company_id=UUID
// ?opening_id=UUID
// ?status=submitted
// =========================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const companyId = searchParams.get("company_id");
    const openingId = searchParams.get("opening_id");
    const status = searchParams.get("status");

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (companyId) {
      const result = uuidSchema.safeParse(companyId);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid company ID",
          },
          { status: 400 },
        );
      }

      query = query.eq("company_id", companyId);
    }

    if (openingId) {
      const result = uuidSchema.safeParse(openingId);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid opening ID",
          },
          { status: 400 },
        );
      }

      query = query.eq("opening_id", openingId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get applications error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to fetch job applications",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: data?.length ?? 0,
        applications: data ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET applications API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// =========================
// POST
// Create application
// =========================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createApplicationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const applicationData = result.data;

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        company_id: applicationData.company_id,
        opening_id: applicationData.opening_id ?? null,
        full_name: applicationData.full_name,
        email: applicationData.email,
        phone: applicationData.phone,
        desired_role: applicationData.desired_role,
        resume_link: applicationData.resume_link,
        cover_letter: applicationData.cover_letter ?? null,
        ats_score: applicationData.ats_score ?? 0,
        ats_threshold_at_submission:
          applicationData.ats_threshold_at_submission ?? 60,
        ats_report: applicationData.ats_report ?? {},
        status: applicationData.status ?? "submitted",
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create application error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create job application",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job application created successfully",
        application: data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST applications API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// =========================
// PUT
// Update application
// Usage:
// PUT /api/job-applications?id=APPLICATION_UUID
// =========================

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required",
        },
        { status: 400 },
      );
    }

    const idResult = uuidSchema.safeParse(id);

    if (!idResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid application ID",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const result = updateApplicationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updateData = result.data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided for update",
        },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("job_applications")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Update application error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update job application",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job application updated successfully",
        application: data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT applications API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

// =========================
// DELETE
// Delete application
// Usage:
// DELETE /api/job-applications?id=APPLICATION_UUID
// =========================

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required",
        },
        { status: 400 },
      );
    }

    const idResult = uuidSchema.safeParse(id);

    if (!idResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid application ID",
        },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("job_applications")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      console.error("Delete application error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to delete job application",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job application deleted successfully",
        id: data.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE applications API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}