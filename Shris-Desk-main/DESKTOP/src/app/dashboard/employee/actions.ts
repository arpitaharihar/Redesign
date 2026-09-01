"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const conversationSchema = z.object({
  kind: z.enum(["direct", "group"]),
  title: z.string().trim().optional(),
  redirectTo: z.string().min(1),
});

const renameConversationSchema = z.object({
  conversationId: z.string().uuid(),
  title: z.string().trim().min(2).max(80),
  redirectTo: z.string().min(1),
});

const meetingSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  scheduledFor: z.string().optional(),
  redirectTo: z.string().min(1),
});

const settingsSchema = z.object({
  fullName: z.string().trim().min(2),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  employeeCode: z.string().trim().optional(),
  location: z.string().trim().optional(),
  shiftName: z.string().trim().optional(),
  joiningDate: z.string().optional(),
  managerName: z.string().trim().optional(),
  emergencyContact: z.string().trim().optional(),
  skills: z.string().trim().optional(),
  profileCompleted: z.coerce.boolean().optional(),
});

const submissionSchema = z.object({
  taskId: z.string().uuid(),
  submissionUrl: z.string().url(),
  notes: z.string().trim().optional(),
  redirectTo: z.string().min(1),
});

function redirectWithResult(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function createConversationAction(formData: FormData) {
  const parsed = conversationSchema.safeParse({
    kind: formData.get("kind"),
    title: formData.get("title") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/employee/chat"),
      "error",
      "Enter valid chat details before creating the conversation.",
    );
  }

  const selectedParticipantIds = Array.from(
    new Set(
      formData
        .getAll("participantIds")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  );

  if (parsed.data.kind === "direct" && selectedParticipantIds.length !== 1) {
    redirectWithResult(
      parsed.data.redirectTo,
      "error",
      "Direct chat needs exactly one teammate.",
    );
  }

  if (parsed.data.kind === "group" && selectedParticipantIds.length < 2) {
    redirectWithResult(
      parsed.data.redirectTo,
      "error",
      "Group chat needs at least two teammates.",
    );
  }

  await requireEmployeeProfile();
  const supabase = await createSupabaseServerClient();

  const { data: conversationId, error } = await supabase.rpc("create_conversation_public", {
    conversation_kind: parsed.data.kind,
    conversation_title: parsed.data.title || null,
    participant_ids: selectedParticipantIds,
  });

  if (error || !conversationId) {
    redirectWithResult(parsed.data.redirectTo, "error", error?.message ?? "Unable to create the conversation.");
  }

  revalidatePath("/dashboard/employee/chat");
  redirect(`/dashboard/employee/chat?conversation=${conversationId}`);
}

export async function renameConversationAction(formData: FormData) {
  const parsed = renameConversationSchema.safeParse({
    conversationId: formData.get("conversationId"),
    title: formData.get("title"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/employee/chat"),
      "error",
      "Enter a valid group name before saving.",
    );
  }

  await requireEmployeeProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("rename_group_conversation_public", {
    target_conversation_id: parsed.data.conversationId,
    next_title: parsed.data.title,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/employee/chat");
  redirectWithResult(parsed.data.redirectTo, "success", "Group name updated.");
}

export async function createMeetingAction(formData: FormData) {
  const parsed = meetingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    scheduledFor: formData.get("scheduledFor") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/employee/meetings"),
      "error",
      "Enter valid meeting details before creating the room.",
    );
  }

  const profile = await requireEmployeeProfile();
  const supabase = await createSupabaseServerClient();
  const roomCode = `${profile.companyCode?.toLowerCase() ?? "smartdesk"}-${crypto.randomUUID().slice(0, 8)}`;
  const status = parsed.data.scheduledFor ? "scheduled" : "live";

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      company_id: profile.companyId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      room_code: roomCode,
      status,
      scheduled_for: parsed.data.scheduledFor || null,
      created_by_profile_id: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/employee/meetings");
  redirect(`/dashboard/employee/meetings?meeting=${data.id}`);
}

export async function updateEmployeeSettingsAction(formData: FormData) {
  const parsed = settingsSchema.safeParse({
    fullName: formData.get("fullName"),
    department: formData.get("department") || undefined,
    phone: formData.get("phone") || undefined,
    jobTitle: formData.get("jobTitle") || undefined,
    employeeCode: formData.get("employeeCode") || undefined,
    location: formData.get("location") || undefined,
    shiftName: formData.get("shiftName") || undefined,
    joiningDate: formData.get("joiningDate") || undefined,
    managerName: formData.get("managerName") || undefined,
    emergencyContact: formData.get("emergencyContact") || undefined,
    skills: formData.get("skills") || undefined,
    profileCompleted: formData.get("profileCompleted") === "on",
  });

  if (!parsed.success) {
    redirectWithResult(
      "/dashboard/employee/settings",
      "error",
      "Enter valid profile details before saving settings.",
    );
  }

  const profile = await requireEmployeeProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
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
      profile_completed: parsed.data.profileCompleted ?? false,
    })
    .eq("id", profile.id);

  if (error) {
    redirectWithResult("/dashboard/employee/settings", "error", error.message);
  }

  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard/employee/settings");
  redirectWithResult("/dashboard/employee/settings", "success", "Settings updated successfully.");
}

export async function submitTaskSubmissionAction(formData: FormData) {
  const parsed = submissionSchema.safeParse({
    taskId: formData.get("taskId"),
    submissionUrl: formData.get("submissionUrl"),
    notes: formData.get("notes") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/employee/tasks"),
      "error",
      "Provide a valid submission link before sending.",
    );
  }

  const profile = await requireEmployeeProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("task_submissions").insert({
    task_id: parsed.data.taskId,
    profile_id: profile.id,
    submission_url: parsed.data.submissionUrl,
    notes: parsed.data.notes || null,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  await supabase
    .from("tasks")
    .update({ status: "review" })
    .eq("id", parsed.data.taskId)
    .eq("assignee_profile_id", profile.id);

  revalidatePath("/dashboard/employee");
  revalidatePath("/dashboard/employee/tasks");
  redirectWithResult(parsed.data.redirectTo, "success", "Submission sent for review.");
}
