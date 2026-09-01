import { NextResponse } from "next/server";
import { z } from "zod";

import { EMPLOYEE_FACE_ENROLLMENT_PROMPTS } from "@/lib/face-auth-shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const enrollmentPromptSchema = z.enum(EMPLOYEE_FACE_ENROLLMENT_PROMPTS);

const faceSampleSchema = z.object({
  prompt: enrollmentPromptSchema,
  descriptor: z.array(z.number()).length(128),
  score: z.number().min(0).max(1),
  yaw: z.number().min(-2).max(2),
  pitch: z.number().min(-2).max(2),
  capturedAt: z.string().datetime(),
});

const enrollmentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  department: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  employeeCode: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  shiftName: z.string().trim().max(120).optional(),
  joiningDate: z.string().optional(),
  managerName: z.string().trim().max(120).optional(),
  emergencyContact: z.string().trim().max(160).optional(),
  skills: z.string().trim().max(1200).optional(),
  samples: z.array(faceSampleSchema).length(EMPLOYEE_FACE_ENROLLMENT_PROMPTS.length),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to register face access." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = enrollmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid face registration payload." },
      { status: 400 },
    );
  }

  const prompts = new Set(parsed.data.samples.map((sample) => sample.prompt));
  if (prompts.size !== EMPLOYEE_FACE_ENROLLMENT_PROMPTS.length) {
    return NextResponse.json(
      { error: "Capture each requested face angle once before completing setup." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "employee" || !profile.company_id) {
    return NextResponse.json(
      { error: "Employee profile not found for face registration." },
      { status: 403 },
    );
  }

  const admin = createSupabaseAdminClient();
  const descriptors = parsed.data.samples.map((sample) => sample.descriptor);
  const sampleMeta = parsed.data.samples.map((sample) => ({
    prompt: sample.prompt,
    score: sample.score,
    yaw: sample.yaw,
    pitch: sample.pitch,
    capturedAt: sample.capturedAt,
  }));

  const now = new Date().toISOString();
  const [profileUpdateResult, faceProfileResult] = await Promise.all([
    admin
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        department: parsed.data.department || null,
        phone: parsed.data.phone || null,
        job_title: parsed.data.jobTitle || null,
        employee_code: parsed.data.employeeCode || null,
        location: parsed.data.location || null,
        shift_name: parsed.data.shiftName || null,
        joining_date: parsed.data.joiningDate || null,
        manager_name: parsed.data.managerName || null,
        emergency_contact: parsed.data.emergencyContact || null,
        skills: parsed.data.skills || null,
        profile_completed: true,
        face_enrolled: true,
        face_registered_at: now,
      })
      .eq("id", user.id),
    admin.from("employee_face_profiles").upsert(
      {
        profile_id: user.id,
        company_id: profile.company_id,
        descriptor_samples: descriptors,
        sample_count: descriptors.length,
        enrollment_meta: {
          samples: sampleMeta,
          completedAt: now,
        },
        active: true,
        updated_at: now,
      },
      {
        onConflict: "profile_id",
      },
    ),
  ]);

  if (profileUpdateResult.error || faceProfileResult.error) {
    return NextResponse.json(
      {
        error:
          profileUpdateResult.error?.message ??
          faceProfileResult.error?.message ??
          "Unable to finish employee face setup.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    redirectTo: "/dashboard/employee?success=Secure+employee+face+setup+completed.",
  });
}
