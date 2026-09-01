import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";

import { createSupabaseAdminClient } from "./supabase/admin";
export {
  EMPLOYEE_FACE_ENROLLMENT_PROMPTS,
  EMPLOYEE_FACE_LOGIN_PROMPTS,
} from "./face-auth-shared";
export type { EnrollmentPrompt, FaceSample, LoginPrompt } from "./face-auth-shared";

export type EmployeeFaceChallenge = {
  id: string;
  profileId: string;
  email: string;
  fullName: string | null;
  companyName: string | null;
  companyCode: string | null;
  expiresAt: string;
};

const FACE_MATCH_THRESHOLD = 0.52;

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function euclideanDistance(left: number[], right: number[]) {
  if (left.length !== right.length) {
    throw new Error("Face descriptor length mismatch.");
  }

  let sum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }

  return Math.sqrt(sum);
}

export function getBestFaceDistance(
  enrolledSamples: number[][],
  candidate: number[],
) {
  return enrolledSamples.reduce((best, sample) => {
    const distance = euclideanDistance(sample, candidate);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);
}

export function evaluateFaceVerification(
  enrolledSamples: number[][],
  verificationSamples: number[][],
) {
  const distances = verificationSamples.map((sample) =>
    getBestFaceDistance(enrolledSamples, sample),
  );
  const successfulMatches = distances.filter(
    (distance) => distance <= FACE_MATCH_THRESHOLD,
  ).length;
  const averageDistance = average(distances);
  const bestDistance = Math.min(...distances);

  return {
    matched: successfulMatches >= Math.max(2, verificationSamples.length - 1),
    successfulMatches,
    averageDistance,
    bestDistance,
    distances,
  };
}

export async function getAppOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  if (!host) {
    const configuredOrigin =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (configuredOrigin) {
      return configuredOrigin.replace(/\/$/, "");
    }

    return "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

export async function createEmployeeFaceChallenge(profileId: string) {
  const admin = createSupabaseAdminClient();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const headerStore = await headers();

  const { error } = await admin.from("employee_face_login_challenges").insert({
    profile_id: profileId,
    challenge_hash: tokenHash,
    requested_ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: headerStore.get("user-agent"),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

export async function getEmployeeFaceChallenge(
  challengeToken: string,
): Promise<EmployeeFaceChallenge | null> {
  const admin = createSupabaseAdminClient();
  const tokenHash = hashToken(challengeToken);

  const { data: challenge, error } = await admin
    .from("employee_face_login_challenges")
    .select("id, profile_id, expires_at, consumed_at")
    .eq("challenge_hash", tokenHash)
    .maybeSingle();

  if (error || !challenge) {
    return null;
  }

  if (
    challenge.consumed_at ||
    new Date(challenge.expires_at as string).getTime() <= Date.now()
  ) {
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, company_id, companies(name, code)")
    .eq("id", challenge.profile_id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const company = Array.isArray(profile.companies)
    ? profile.companies[0]
    : profile.companies;

  return {
    id: challenge.id as string,
    profileId: profile.id as string,
    email: profile.email as string,
    fullName: (profile.full_name as string | null) ?? null,
    companyName: (company?.name as string | undefined) ?? null,
    companyCode: (company?.code as string | undefined) ?? null,
    expiresAt: challenge.expires_at as string,
  };
}

export async function consumeEmployeeFaceChallenge(challengeToken: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("employee_face_login_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("challenge_hash", hashToken(challengeToken))
    .is("consumed_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function issueEmployeeFaceMagicLink(email: string, nextPath: string) {
  const admin = createSupabaseAdminClient();
  const origin = await getAppOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo,
    },
  });

  if (error || !data.properties.hashed_token) {
    throw new Error(error?.message ?? "Unable to generate a face login link.");
  }

  return `${origin}/auth/face-complete?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&next=${encodeURIComponent(nextPath)}`;
}
