import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    // 1. Read request body
    const body = await request.json();

    // 2. Validate input
    const result = loginSchema.safeParse(body);

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

    const { email, password } = result.data;

    // 3. Create Supabase Admin client
    const supabase = createSupabaseAdminClient();

    // 4. Find profile using email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
        department,
        profile_completed,
        face_enrolled,
        is_active,
        created_at,
        password
      `)
      .ilike("email", email)
      .maybeSingle();

    // 5. Database error
    if (profileError) {
      console.error("PROFILE LOOKUP ERROR:", profileError);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify user",
        },
        { status: 500 }
      );
    }

    // 6. User not found
    if (!profile) {
      console.log("LOGIN FAILED: User not found:", email);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // 7. Check password
    if (!profile.password || profile.password !== password) {
      console.log("LOGIN FAILED: Password mismatch for:", email);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // 8. Check whether account is active
    if (!profile.is_active) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is inactive",
        },
        { status: 403 }
      );
    }

    // 9. Safely remove password before sending profile to frontend
    const safeProfile = { ...profile };
    delete (safeProfile as { password?: string }).password;

    // 10. Prepare success response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: profile.id,
          email: profile.email,
        },
        profile: safeProfile,
      },
      { status: 200 }
    );

    // 11. Set session cookie in browser
    const sessionData = JSON.stringify({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    response.cookies.set({
      name: "user_session",
      value: sessionData,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}