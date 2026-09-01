import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

/* =========================================================
   VALIDATION SCHEMAS
========================================================= */

const createJobOpeningSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  title: z.string().trim().min(1, "Title is required"),
  department: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  min_ats_score: z.number().int().min(0).max(100).optional(),
  status: z.string().trim().optional(),
  ats_keywords: z.string().trim().optional().nullable(),

  shortlist_email_subject: z.string().trim().optional().nullable(),
  shortlist_email_body: z.string().trim().optional().nullable(),

  hire_email_subject: z.string().trim().optional().nullable(),
  hire_email_body: z.string().trim().optional().nullable(),

  reject_email_subject: z.string().trim().optional().nullable(),
  reject_email_body: z.string().trim().optional().nullable(),
});

const updateJobOpeningSchema = z.object({
  company_id: z.string().uuid("Invalid company ID").optional(),
  title: z.string().trim().min(1, "Title cannot be empty").optional(),
  department: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  min_ats_score: z.number().int().min(0).max(100).optional(),
  status: z.string().trim().optional(),
  ats_keywords: z.string().trim().optional().nullable(),

  shortlist_email_subject: z.string().trim().optional().nullable(),
  shortlist_email_body: z.string().trim().optional().nullable(),

  hire_email_subject: z.string().trim().optional().nullable(),
  hire_email_body: z.string().trim().optional().nullable(),

  reject_email_subject: z.string().trim().optional().nullable(),
  reject_email_body: z.string().trim().optional().nullable(),
});

/* =========================================================
   GET
   GET /api/job-openings
   GET /api/job-openings?id=<id>
   GET /api/job-openings?company_id=<company_id>
========================================================= */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const companyId = searchParams.get("company_id");

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("job_openings")
      .select(`
        id,
        company_id,
        title,
        department,
        description,
        min_ats_score,
        status,
        created_at,
        ats_keywords,
        shortlist_email_subject,
        shortlist_email_body,
        hire_email_subject,
        hire_email_body,
        reject_email_subject,
        reject_email_body
      `)
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get job openings error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to fetch job openings",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job openings fetched successfully",
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET job openings API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   POST
   POST /api/job-openings
========================================================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createJobOpeningSchema.safeParse(body);

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

    const {
      company_id,
      title,
      department,
      description,
      min_ats_score,
      status,
      ats_keywords,

      shortlist_email_subject,
      shortlist_email_body,

      hire_email_subject,
      hire_email_body,

      reject_email_subject,
      reject_email_body,
    } = result.data;

    const supabase = createSupabaseAdminClient();

    // Check whether company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", company_id)
      .maybeSingle();

    if (companyError) {
      console.error("Company lookup error:", companyError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify company",
        },
        { status: 500 },
      );
    }

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message: "Company not found",
        },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("job_openings")
      .insert({
        company_id,
        title,
        department: department ?? null,
        description: description ?? null,
        min_ats_score: min_ats_score ?? 60,
        status: status ?? "draft",
        ats_keywords: ats_keywords ?? null,

        shortlist_email_subject: shortlist_email_subject ?? null,
        shortlist_email_body: shortlist_email_body ?? null,

        hire_email_subject: hire_email_subject ?? null,
        hire_email_body: hire_email_body ?? null,

        reject_email_subject: reject_email_subject ?? null,
        reject_email_body: reject_email_body ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create job opening error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create job opening",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job opening created successfully",
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST job opening API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   PUT
   PUT /api/job-openings?id=<id>
========================================================= */

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Job opening ID is required",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const result = updateJobOpeningSchema.safeParse(body);

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

    const supabase = createSupabaseAdminClient();

    // Check whether job opening exists
    const { data: existingOpening, error: existingError } = await supabase
      .from("job_openings")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Job opening lookup error:", existingError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify job opening",
        },
        { status: 500 },
      );
    }

    if (!existingOpening) {
      return NextResponse.json(
        {
          success: false,
          message: "Job opening not found",
        },
        { status: 404 },
      );
    }

    // If company_id is being changed, verify the new company
    if (result.data.company_id) {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("id", result.data.company_id)
        .maybeSingle();

      if (companyError) {
        console.error("Company lookup error:", companyError);

        return NextResponse.json(
          {
            success: false,
            message: "Unable to verify company",
          },
          { status: 500 },
        );
      }

      if (!company) {
        return NextResponse.json(
          {
            success: false,
            message: "Company not found",
          },
          { status: 404 },
        );
      }
    }

    const { data, error } = await supabase
      .from("job_openings")
      .update(result.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update job opening error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update job opening",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job opening updated successfully",
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT job opening API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

/* =========================================================
   DELETE
   DELETE /api/job-openings?id=<id>
========================================================= */

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Job opening ID is required",
        },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check whether job opening exists
    const { data: existingOpening, error: existingError } = await supabase
      .from("job_openings")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Job opening lookup error:", existingError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify job opening",
        },
        { status: 500 },
      );
    }

    if (!existingOpening) {
      return NextResponse.json(
        {
          success: false,
          message: "Job opening not found",
        },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("job_openings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete job opening error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to delete job opening",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job opening deleted successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DELETE job opening API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}