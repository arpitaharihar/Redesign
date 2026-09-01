import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  code: z.string().trim().min(1, "Company code is required"),
  contact_email: z.string().trim().email("Invalid contact email"),
  ats_threshold: z.number().int().min(0).max(100).optional(),
  status: z.enum(["active", "paused", "pending"]).optional(),
  notes: z.string().trim().nullable().optional(),
});

const updateCompanySchema = companySchema.partial().extend({
  id: z.string().uuid("Invalid company ID"),
});

// CREATE COMPANY
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = companySchema.safeParse(body);

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
      name,
      code,
      contact_email,
      ats_threshold = 60,
      status = "pending",
      notes = null,
    } = result.data;

    // Check duplicate company code
    const { data: existingCompany, error: checkError } = await supabase
      .from("companies")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (checkError) {
      console.error("COMPANY CHECK ERROR:", checkError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify company",
        },
        { status: 500 }
      );
    }

    if (existingCompany) {
      return NextResponse.json(
        {
          success: false,
          message: "Company code already exists",
        },
        { status: 409 }
      );
    }

    const { data: company, error } = await supabase
      .from("companies")
      .insert({
        name,
        code,
        contact_email,
        ats_threshold,
        status,
        notes,
      })
      .select(`
        id,
        name,
        code,
        contact_email,
        ats_threshold,
        status,
        notes,
        created_at
      `)
      .single();

    if (error) {
      console.error("COMPANY CREATE ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create company",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Company created successfully",
        company,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE COMPANY API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET ALL COMPANIES
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: companies, error } = await supabase
      .from("companies")
      .select(`
        id,
        name,
        code,
        contact_email,
        ats_threshold,
        status,
        notes,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("COMPANY FETCH ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to fetch companies",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Companies fetched successfully",
        companies,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET COMPANIES API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// UPDATE COMPANY
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const result = updateCompanySchema.safeParse(body);

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

    const { id, ...updates } = result.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No fields provided for update",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check company exists
    const { data: existingCompany, error: findError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error("COMPANY FIND ERROR:", findError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to find company",
        },
        { status: 500 }
      );
    }

    if (!existingCompany) {
      return NextResponse.json(
        {
          success: false,
          message: "Company not found",
        },
        { status: 404 }
      );
    }

    // Check duplicate code if code is being changed
    if (updates.code) {
      const { data: duplicateCode, error: duplicateError } = await supabase
        .from("companies")
        .select("id")
        .eq("code", updates.code)
        .neq("id", id)
        .maybeSingle();

      if (duplicateError) {
        console.error("COMPANY CODE CHECK ERROR:", duplicateError);

        return NextResponse.json(
          {
            success: false,
            message: "Unable to verify company code",
          },
          { status: 500 }
        );
      }

      if (duplicateCode) {
        return NextResponse.json(
          {
            success: false,
            message: "Company code already exists",
          },
          { status: 409 }
        );
      }
    }

    const { data: company, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", id)
      .select(`
        id,
        name,
        code,
        contact_email,
        ats_threshold,
        status,
        notes,
        created_at
      `)
      .single();

    if (error) {
      console.error("COMPANY UPDATE ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to update company",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Company updated successfully",
        company,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE COMPANY API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE COMPANY
export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const idSchema = z.object({
      id: z.string().uuid("Invalid company ID"),
    });

    const result = idSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid company ID",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: existingCompany, error: findError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", result.data.id)
      .maybeSingle();

    if (findError) {
      console.error("COMPANY FIND ERROR:", findError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to find company",
        },
        { status: 500 }
      );
    }

    if (!existingCompany) {
      return NextResponse.json(
        {
          success: false,
          message: "Company not found",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", result.data.id);

    if (deleteError) {
      console.error("COMPANY DELETE ERROR:", deleteError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to delete company",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Company deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE COMPANY API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}