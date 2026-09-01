import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const uuidSchema = z.string().uuid("Invalid UUID");

const createProjectSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  name: z.string().trim().min(1, "Project name is required"),
  client_name: z.string().trim().nullable().optional(),
  status: z.string().optional(),
  budget_inr: z.number().nonnegative().nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  due_date: z.string().date().nullable().optional(),
});

const updateProjectSchema = z.object({
  company_id: z.string().uuid("Invalid company ID").optional(),
  name: z.string().trim().min(1, "Project name is required").optional(),
  client_name: z.string().trim().nullable().optional(),
  status: z.string().optional(),
  budget_inr: z.number().nonnegative().nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  due_date: z.string().date().nullable().optional(),
});

// =========================
// GET
// GET /api/projects
// GET /api/projects?id=UUID
// GET /api/projects?company_id=UUID
// =========================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const companyId = searchParams.get("company_id");

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) {
      const result = uuidSchema.safeParse(id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid project ID",
          },
          { status: 400 }
        );
      }

      query = query.eq("id", id);
    }

    if (companyId) {
      const result = uuidSchema.safeParse(companyId);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid company ID",
          },
          { status: 400 }
        );
      }

      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET projects error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch projects",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET projects API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// =========================
// POST
// POST /api/projects
// =========================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const {
      company_id,
      name,
      client_name,
      status,
      budget_inr,
      start_date,
      due_date,
    } = result.data;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        company_id,
        name,
        client_name: client_name ?? null,
        status: status ?? "planned",
        budget_inr: budget_inr ?? null,
        start_date: start_date ?? null,
        due_date: due_date ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("POST projects error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create project",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST projects API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// =========================
// PUT
// PUT /api/projects?id=UUID
// =========================

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required",
        },
        { status: 400 }
      );
    }

    const idResult = uuidSchema.safeParse(id);

    if (!idResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const result = updateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (Object.keys(result.data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided for update",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("projects")
      .update(result.data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("PUT projects error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update project",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Project updated successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT projects API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE
// DELETE /api/projects?id=UUID
// =========================

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required",
        },
        { status: 400 }
      );
    }

    const idResult = uuidSchema.safeParse(id);

    if (!idResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("DELETE projects error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete project",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Project deleted successfully",
        id: data.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE projects API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}