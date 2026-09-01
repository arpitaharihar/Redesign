import { NextResponse } from "next/server";
import { z } from "zod";

import { EMPLOYEE_FACE_LOGIN_PROMPTS } from "@/lib/face-auth-shared";
import {
  consumeEmployeeFaceChallenge,
  evaluateFaceVerification,
  getEmployeeFaceChallenge,
  issueEmployeeFaceMagicLink,
} from "@/lib/face-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const loginPromptSchema = z.enum(EMPLOYEE_FACE_LOGIN_PROMPTS);

const verificationSampleSchema = z.object({
  prompt: loginPromptSchema,
  descriptor: z.array(z.number()).length(128),
  score: z.number().min(0).max(1),
  yaw: z.number().min(-2).max(2),
  pitch: z.number().min(-2).max(2),
  capturedAt: z.string().datetime(),
});

const verificationSchema = z.object({
  challengeToken: z.string().min(20),
  samples: z.array(verificationSampleSchema).length(EMPLOYEE_FACE_LOGIN_PROMPTS.length),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = verificationSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid face verification payload." }, { status: 400 });
  }

  const promptSet = new Set(parsed.data.samples.map((sample) => sample.prompt));
  if (promptSet.size !== EMPLOYEE_FACE_LOGIN_PROMPTS.length) {
    return NextResponse.json(
      { error: "Capture every requested verification angle before continuing." },
      { status: 400 },
    );
  }

  const challenge = await getEmployeeFaceChallenge(parsed.data.challengeToken);
  if (!challenge) {
    return NextResponse.json(
      { error: "This face login session has expired. Start a new verification." },
      { status: 410 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: faceProfile, error: faceProfileError } = await admin
    .from("employee_face_profiles")
    .select("descriptor_samples")
    .eq("profile_id", challenge.profileId)
    .eq("active", true)
    .maybeSingle();

  if (faceProfileError || !faceProfile) {
    return NextResponse.json(
      { error: "Stored face registration was not found for this employee account." },
      { status: 404 },
    );
  }

  const enrolledSamples = Array.isArray(faceProfile.descriptor_samples)
    ? (faceProfile.descriptor_samples as number[][])
    : [];

  if (!enrolledSamples.length) {
    return NextResponse.json(
      { error: "Stored face registration is incomplete. Re-register the employee face profile." },
      { status: 409 },
    );
  }

  const result = evaluateFaceVerification(
    enrolledSamples,
    parsed.data.samples.map((sample) => sample.descriptor),
  );

  if (!result.matched) {
    return NextResponse.json(
      {
        error:
          "Face authentication failed. Use clearer lighting and repeat the requested head turns.",
      },
      { status: 401 },
    );
  }

  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("profiles")
      .update({
        face_last_verified_at: now,
      })
      .eq("id", challenge.profileId),
    admin
      .from("employee_face_profiles")
      .update({
        last_verified_at: now,
        updated_at: now,
      })
      .eq("profile_id", challenge.profileId),
  ]);

  await consumeEmployeeFaceChallenge(parsed.data.challengeToken);
  const redirectUrl = await issueEmployeeFaceMagicLink(
    challenge.email,
    "/dashboard/employee",
  );

  return NextResponse.json({
    success: true,
    redirectUrl,
  });
}
