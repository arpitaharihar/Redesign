import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const createCredentialSchema = z.object({
  company_id: z.string().uuid("Invalid company ID"),
  application_id: z.string().uuid("Invalid application ID"),
  recipient_email: z.string().trim().email("Invalid recipient email"),
  temp_password: z.string().min(1, "Temporary password is required"),
});

const updateCredentialSchema = z.object({
  company_id: z.string().uuid("Invalid company ID").optional(),
  application_id: z.string().uuid("Invalid application ID").optional(),
  recipient_email: z
    .string()
    .trim()
    .email("Invalid recipient email")
    .optional(),
  temp_password: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseAdminClient();

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const companyId = searchParams.get("company_id");
    const applicationId = searchParams.get("application_id");

    let query = supabase
      .from("candidate_credentials")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    if (applicationId) {
      query = query.eq("application_id", applicationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("GET candidate credentials error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch candidate credentials",
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
    console.error("GET API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createCredentialSchema.safeParse(body);

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
      application_id,
      recipient_email,
      temp_password,
    } = result.data;

    const { data, error } = await supabase
      .from("candidate_credentials")
      .insert({
        company_id,
        application_id,
        recipient_email,
        temp_password,
      })
      .select("*")
      .single();

    if (error) {
      console.error("POST candidate credentials error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to create candidate credentials",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Candidate credentials created successfully",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Credential ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const result = updateCredentialSchema.safeParse(body);

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

    const { data, error } = await supabase
      .from("candidate_credentials")
      .update(result.data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("PUT candidate credentials error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to update candidate credentials",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Candidate credentials not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Candidate credentials updated successfully",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Credential ID is required",
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("candidate_credentials")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("DELETE candidate credentials error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to delete candidate credentials",
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message: "Candidate credentials not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Candidate credentials deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}