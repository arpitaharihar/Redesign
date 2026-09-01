"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireProfile } from "@/lib/auth";
import {
  backfillCompanyEmployeeAnalysisReports,
  linkAnalysisReportToProfile,
  upsertApplicationAnalysisReport,
} from "@/lib/employee-analysis-reports";
import { sendEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const projectSchema = z.object({
  name: z.string().trim().min(2),
  clientName: z.string().trim().optional(),
  status: z.enum(["planned", "active", "on_hold", "completed"]),
  budgetInr: z.coerce.number().min(0).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  redirectTo: z.string().min(1),
});

const projectUpdateSchema = projectSchema.extend({
  projectId: z.string().uuid(),
});

const taskSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  projectId: z.string().optional(),
  assigneeProfileId: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().optional(),
  redirectTo: z.string().min(1),
});

const taskUpdateSchema = taskSchema.extend({
  taskId: z.string().uuid(),
});

const openingSchema = z.object({
  title: z.string().trim().min(2),
  department: z.string().trim().optional(),
  description: z.string().trim().min(10),
  atsKeywords: z.string().trim().optional(),
  minAtsScore: z.coerce.number().int().min(0).max(100),
  shortlistSubject: z.string().trim().optional(),
  shortlistBody: z.string().trim().optional(),
  hireSubject: z.string().trim().optional(),
  hireBody: z.string().trim().optional(),
  rejectSubject: z.string().trim().optional(),
  rejectBody: z.string().trim().optional(),
  status: z.enum(["draft", "published", "closed"]),
  redirectTo: z.string().min(1),
});

const openingUpdateSchema = openingSchema.extend({
  openingId: z.string().uuid(),
});

const feedbackSchema = z.object({
  reviewerName: z.string().trim().min(2),
  feedbackType: z.string().trim().min(2),
  rating: z.coerce.number().int().min(1).max(5),
  note: z.string().trim().min(10),
  redirectTo: z.string().min(1),
});

const applicationStatusSchema = z.object({
  applicationId: z.string().uuid(),
  openingId: z.string().uuid().optional(),
  candidateEmail: z.string().email().optional(),
  candidateName: z.string().trim().optional(),
  status: z.enum([
    "submitted",
    "ats_reviewed",
    "ats_rejected",
    "admin_review",
    "shortlisted",
    "rejected",
    "approved",
    "hired",
  ]),
  redirectTo: z.string().min(1),
});

const submissionReviewSchema = z.object({
  submissionId: z.string().uuid(),
  status: z.enum(["accepted", "needs_changes", "rejected"]),
  feedback: z.string().trim().optional(),
  redirectTo: z.string().min(1),
});

const backfillAnalysisSchema = z.object({
  redirectTo: z.string().min(1),
});

function redirectWithResult(path: string, type: "error" | "success", message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function renderTemplate(template: string, tokens: Record<string, string>) {
  return Object.entries(tokens).reduce((content, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    return content.replace(pattern, value);
  }, template);
}

function buildEmailHtml(content: string, portalUrl: string) {
  const safeContent = content.replace(/\n/g, "<br />");
  const portalButton =
    portalUrl && portalUrl !== "#"
      ? `<a href="${portalUrl}" style="display:inline-block;margin-top:18px;background:#0b6e4f;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600;">Open Applicant Portal</a>`
      : "";
  return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f2f5fb; padding:32px;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(15,23,42,0.12);">
      <div style="background:linear-gradient(135deg,#0b6e4f,#084c61); padding:28px;">
        <div style="color:#e2f4ec; font-size:12px; letter-spacing:0.28em; text-transform:uppercase; font-weight:600;">
          SmartDesk Careers
        </div>
        <div style="color:#ffffff; font-size:24px; font-weight:700; margin-top:8px;">
          Hiring Update
        </div>
      </div>
      <div style="padding:28px 32px;">
        <div style="color:#475569; font-size:14px; margin-bottom:20px;">
          Please review the update below. If you have questions, reply to this email.
        </div>
        <div style="font-size:15px; line-height:1.75; color:#0f172a;">
          ${safeContent}
        </div>
        ${portalButton}
        <div style="margin-top:28px; padding-top:18px; border-top:1px solid #eef2f7; font-size:12px; color:#64748b;">
          Sent by SmartDesk Hiring Team
        </div>
      </div>
    </div>
  </div>
  `;
}

async function requireCompanyAdmin() {
  const profile = await requireProfile();

  if (profile.role !== "company_admin" || !profile.companyId) {
    redirect("/dashboard");
  }

  return profile;
}

export async function createProjectAction(formData: FormData) {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    status: formData.get("status"),
    budgetInr: formData.get("budgetInr") || undefined,
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/projects"),
      "error",
      "Enter valid project details before saving.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").insert({
    company_id: profile.companyId,
    name: parsed.data.name,
    client_name: parsed.data.clientName || null,
    status: parsed.data.status,
    budget_inr: parsed.data.budgetInr ?? null,
    start_date: parsed.data.startDate || null,
    due_date: parsed.data.dueDate || null,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin");
  revalidatePath("/dashboard/company-admin/projects");
  redirectWithResult(parsed.data.redirectTo, "success", "Project created successfully.");
}

export async function updateProjectAction(formData: FormData) {
  const parsed = projectUpdateSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    clientName: formData.get("clientName") || undefined,
    status: formData.get("status"),
    budgetInr: formData.get("budgetInr") || undefined,
    startDate: formData.get("startDate") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/projects"),
      "error",
      "Enter valid project details before updating.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      client_name: parsed.data.clientName || null,
      status: parsed.data.status,
      budget_inr: parsed.data.budgetInr ?? null,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null,
    })
    .eq("id", parsed.data.projectId)
    .eq("company_id", profile.companyId);

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin/projects");
  redirectWithResult(parsed.data.redirectTo, "success", "Project updated.");
}

export async function createTaskAction(formData: FormData) {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    projectId: formData.get("projectId") || undefined,
    assigneeProfileId: formData.get("assigneeProfileId") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/projects"),
      "error",
      "Enter valid task details before saving.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").insert({
    company_id: profile.companyId,
    project_id: parsed.data.projectId || null,
    assignee_profile_id: parsed.data.assigneeProfileId || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate || null,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin");
  revalidatePath("/dashboard/company-admin/projects");
  redirectWithResult(parsed.data.redirectTo, "success", "Task created successfully.");
}

export async function updateTaskAction(formData: FormData) {
  const parsed = taskUpdateSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    projectId: formData.get("projectId") || undefined,
    assigneeProfileId: formData.get("assigneeProfileId") || undefined,
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/tasks"),
      "error",
      "Enter valid task details before updating.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      project_id: parsed.data.projectId || null,
      assignee_profile_id: parsed.data.assigneeProfileId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate || null,
    })
    .eq("id", parsed.data.taskId)
    .eq("company_id", profile.companyId);

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin/projects");
  revalidatePath("/dashboard/company-admin/tasks");
  redirectWithResult(parsed.data.redirectTo, "success", "Task updated.");
}

export async function createJobOpeningAction(formData: FormData) {
  const parsed = openingSchema.safeParse({
    title: formData.get("title"),
    department: formData.get("department") || undefined,
    description: formData.get("description"),
    atsKeywords: formData.get("atsKeywords") || undefined,
    minAtsScore: formData.get("minAtsScore"),
    shortlistSubject: formData.get("shortlistSubject") || undefined,
    shortlistBody: formData.get("shortlistBody") || undefined,
    hireSubject: formData.get("hireSubject") || undefined,
    hireBody: formData.get("hireBody") || undefined,
    rejectSubject: formData.get("rejectSubject") || undefined,
    rejectBody: formData.get("rejectBody") || undefined,
    status: formData.get("status"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/hiring"),
      "error",
      "Enter valid job opening details before saving.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("job_openings").insert({
    company_id: profile.companyId,
    title: parsed.data.title,
    department: parsed.data.department || null,
    description: parsed.data.description,
    ats_keywords: parsed.data.atsKeywords || null,
    min_ats_score: parsed.data.minAtsScore,
    shortlist_email_subject: parsed.data.shortlistSubject || null,
    shortlist_email_body: parsed.data.shortlistBody || null,
    hire_email_subject: parsed.data.hireSubject || null,
    hire_email_body: parsed.data.hireBody || null,
    reject_email_subject: parsed.data.rejectSubject || null,
    reject_email_body: parsed.data.rejectBody || null,
    status: parsed.data.status,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin");
  revalidatePath("/dashboard/company-admin/hiring");
  redirectWithResult(parsed.data.redirectTo, "success", "Job opening created successfully.");
}

export async function updateJobOpeningAction(formData: FormData) {
  const parsed = openingUpdateSchema.safeParse({
    openingId: formData.get("openingId"),
    title: formData.get("title"),
    department: formData.get("department") || undefined,
    description: formData.get("description"),
    atsKeywords: formData.get("atsKeywords") || undefined,
    minAtsScore: formData.get("minAtsScore"),
    shortlistSubject: formData.get("shortlistSubject") || undefined,
    shortlistBody: formData.get("shortlistBody") || undefined,
    hireSubject: formData.get("hireSubject") || undefined,
    hireBody: formData.get("hireBody") || undefined,
    rejectSubject: formData.get("rejectSubject") || undefined,
    rejectBody: formData.get("rejectBody") || undefined,
    status: formData.get("status"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/hiring"),
      "error",
      "Enter valid job opening details before updating.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("job_openings")
    .update({
      title: parsed.data.title,
      department: parsed.data.department || null,
      description: parsed.data.description,
      ats_keywords: parsed.data.atsKeywords || null,
      min_ats_score: parsed.data.minAtsScore,
      shortlist_email_subject: parsed.data.shortlistSubject || null,
      shortlist_email_body: parsed.data.shortlistBody || null,
      hire_email_subject: parsed.data.hireSubject || null,
      hire_email_body: parsed.data.hireBody || null,
      reject_email_subject: parsed.data.rejectSubject || null,
      reject_email_body: parsed.data.rejectBody || null,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.openingId)
    .eq("company_id", profile.companyId);

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin/hiring");
  redirectWithResult(parsed.data.redirectTo, "success", "Job opening updated.");
}

export async function createCompanyFeedbackAction(formData: FormData) {
  const parsed = feedbackSchema.safeParse({
    reviewerName: formData.get("reviewerName"),
    feedbackType: formData.get("feedbackType"),
    rating: formData.get("rating"),
    note: formData.get("note"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/feedback"),
      "error",
      "Enter valid feedback before submitting.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").insert({
    company_id: profile.companyId,
    reviewer_name: parsed.data.reviewerName,
    feedback_type: parsed.data.feedbackType,
    rating: parsed.data.rating,
    note: parsed.data.note,
  });

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  revalidatePath("/dashboard/company-admin/feedback");
  revalidatePath("/dashboard/superadmin/feedback");
  redirectWithResult(parsed.data.redirectTo, "success", "Feedback sent to superadmin.");
}

export async function updateApplicationStatusAction(formData: FormData) {
  const parsed = applicationStatusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    openingId: formData.get("openingId") || undefined,
    candidateEmail: formData.get("candidateEmail") || undefined,
    candidateName: formData.get("candidateName") || undefined,
    status: formData.get("status"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/hiring"),
      "error",
      "Select a valid application status.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  let linkedEmployeeProfileId: string | null = null;
  const updatePayload: { status: string; shortlisted_at?: string; hired_at?: string; rejected_at?: string } =
    {
      status: parsed.data.status,
    };

  if (parsed.data.status === "shortlisted") {
    updatePayload.shortlisted_at = now;
  }
  if (parsed.data.status === "hired") {
    updatePayload.hired_at = now;
  }
  if (parsed.data.status === "rejected") {
    updatePayload.rejected_at = now;
  }

  const { error } = await supabase
    .from("job_applications")
    .update(updatePayload)
    .eq("id", parsed.data.applicationId)
    .eq("company_id", profile.companyId);

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  if (
    parsed.data.status === "shortlisted" ||
    parsed.data.status === "hired" ||
    parsed.data.status === "rejected"
  ) {
    const { data: companyRecord } = profile.companyId
      ? await supabase.from("companies").select("name").eq("id", profile.companyId).maybeSingle()
      : { data: null };
    const { data: opening } = parsed.data.openingId
      ? await supabase
          .from("job_openings")
          .select(
            "title, shortlist_email_subject, shortlist_email_body, hire_email_subject, hire_email_body, reject_email_subject, reject_email_body",
          )
          .eq("id", parsed.data.openingId)
          .maybeSingle()
      : { data: null };

    const candidateName = parsed.data.candidateName || "Candidate";
    const subjectMap = {
      shortlisted:
        opening?.shortlist_email_subject ?? `Shortlisted for ${opening?.title ?? "your role"}`,
      hired: opening?.hire_email_subject ?? `Offer for ${opening?.title ?? "your role"}`,
      rejected: opening?.reject_email_subject ?? `Update on ${opening?.title ?? "your role"}`,
    };
    const bodyMap = {
      shortlisted:
        opening?.shortlist_email_body ??
        `Hi ${candidateName}, you have been shortlisted for ${opening?.title ?? "the role"} at ${companyRecord?.name ?? profile.companyName ?? "SmartDesk"}. We will contact you for the next steps.`,
      hired:
        opening?.hire_email_body ??
        `Hi ${candidateName}, congratulations! You have been hired for ${opening?.title ?? "the role"} at ${companyRecord?.name ?? profile.companyName ?? "SmartDesk"}.`,
      rejected:
        opening?.reject_email_body ??
        `Hi ${candidateName}, thanks for applying for ${opening?.title ?? "the role"} at ${companyRecord?.name ?? profile.companyName ?? "SmartDesk"}. We will not be moving forward at this time.`,
    };

    if (parsed.data.candidateEmail) {
      let tempPassword: string | null = null;
      if (parsed.data.status === "hired") {
        tempPassword = `SD-${crypto.randomUUID().slice(0, 8)}`;
        const adminClient = createSupabaseAdminClient();

        const { data: existingUser } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });

        const matchedUser = existingUser?.users?.find(
          (user) => user.email?.toLowerCase() === parsed.data.candidateEmail?.toLowerCase(),
        );
        let userId = matchedUser?.id ?? null;

        if (userId) {
          await adminClient.auth.admin.updateUserById(userId, {
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: candidateName,
            },
          });
        } else {
          const { data: createdUser, error: createError } =
            await adminClient.auth.admin.createUser({
            email: parsed.data.candidateEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: candidateName,
            },
          });
          if (createError) {
            redirectWithResult(parsed.data.redirectTo, "error", createError.message);
          }
          userId = createdUser?.user?.id ?? null;
        }

        if (userId) {
          await adminClient
            .from("profiles")
            .upsert({
              id: userId,
              email: parsed.data.candidateEmail,
              role: "employee",
              company_id: profile.companyId,
              full_name: candidateName,
              profile_completed: true,
              is_active: true,
            })
            .eq("id", userId);
          linkedEmployeeProfileId = userId;
        }

        const { error: credentialError } = await supabase.from("candidate_credentials").insert({
          company_id: profile.companyId,
          application_id: parsed.data.applicationId,
          recipient_email: parsed.data.candidateEmail,
          temp_password: tempPassword,
        });

        if (credentialError) {
          redirectWithResult(parsed.data.redirectTo, "error", credentialError.message);
        }
      }

      const portalUrl = process.env.APPLICANT_PORTAL_URL ?? "#";
      const tokenValues = {
        candidate_name: candidateName,
        candidate_email: parsed.data.candidateEmail,
        opening_title: opening?.title ?? "the role",
        company_name: companyRecord?.name ?? profile.companyName ?? "SmartDesk",
        portal_url: portalUrl,
        temp_password: tempPassword ?? "",
      };
      const subjectTemplate =
        subjectMap[parsed.data.status as "shortlisted" | "hired" | "rejected"];
      const bodyTemplate =
        bodyMap[parsed.data.status as "shortlisted" | "hired" | "rejected"];
      const subject = renderTemplate(subjectTemplate, tokenValues);
      let body = renderTemplate(bodyTemplate, tokenValues);
      if (tempPassword) {
        body = `${body}\n\nLogin email: ${parsed.data.candidateEmail}\nTemporary password: ${tempPassword}\nCompany: ${tokenValues.company_name}`;
      }
      const html = buildEmailHtml(body, portalUrl);
      let outboxStatus = "sent";

      try {
        await sendEmail({ to: parsed.data.candidateEmail, subject, body, html });
      } catch {
        outboxStatus = "failed";
      }

      const { error: emailError } = await supabase.from("email_outbox").insert({
        company_id: profile.companyId,
        recipient_email: parsed.data.candidateEmail,
        subject,
        body,
        status: outboxStatus,
      });

      if (emailError) {
        redirectWithResult(parsed.data.redirectTo, "error", emailError.message);
      }
    }
  }

  await upsertApplicationAnalysisReport(parsed.data.applicationId);
  if (linkedEmployeeProfileId) {
    await linkAnalysisReportToProfile({
      applicationId: parsed.data.applicationId,
      profileId: linkedEmployeeProfileId,
    });
  }

  revalidatePath("/dashboard/company-admin/hiring");
  revalidatePath("/dashboard/company-admin/analytics");
  redirectWithResult(parsed.data.redirectTo, "success", "Application status updated.");
}

export async function reviewTaskSubmissionAction(formData: FormData) {
  const parsed = submissionReviewSchema.safeParse({
    submissionId: formData.get("submissionId"),
    status: formData.get("status"),
    feedback: formData.get("feedback") || undefined,
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/analytics"),
      "error",
      "Select a valid review outcome before submitting.",
    );
  }

  const profile = await requireCompanyAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: submission, error: submissionError } = await supabase
    .from("task_submissions")
    .select("id, task_id")
    .eq("id", parsed.data.submissionId)
    .single();

  if (submissionError || !submission) {
    redirectWithResult(parsed.data.redirectTo, "error", submissionError?.message ?? "Submission not found.");
  }

  const reviewedAt = new Date().toISOString();
  const { error } = await supabase
    .from("task_submissions")
    .update({
      status: parsed.data.status,
      feedback: parsed.data.feedback || null,
      reviewed_at: reviewedAt,
      reviewer_profile_id: profile.id,
    })
    .eq("id", parsed.data.submissionId);

  if (error) {
    redirectWithResult(parsed.data.redirectTo, "error", error.message);
  }

  const taskStatus =
    parsed.data.status === "accepted"
      ? "done"
      : parsed.data.status === "needs_changes"
        ? "in_progress"
        : "review";

  await supabase.from("tasks").update({ status: taskStatus }).eq("id", submission.task_id);

  revalidatePath("/dashboard/company-admin");
  revalidatePath("/dashboard/company-admin/projects");
  revalidatePath("/dashboard/company-admin/analytics");
  revalidatePath("/dashboard/company-admin/employees");
  redirectWithResult(parsed.data.redirectTo, "success", "Submission review saved.");
}

export async function backfillEmployeeAnalysisReportsAction(formData: FormData) {
  const parsed = backfillAnalysisSchema.safeParse({
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirectWithResult(
      String(formData.get("redirectTo") || "/dashboard/company-admin/hiring"),
      "error",
      "Unable to start the analysis backfill.",
    );
  }

  const profile = await requireCompanyAdmin();
  const result = await backfillCompanyEmployeeAnalysisReports(profile.companyId!);

  revalidatePath("/dashboard/company-admin/hiring");
  revalidatePath("/dashboard/company-admin/analytics");
  revalidatePath("/dashboard/company-admin/employees");
  redirectWithResult(
    parsed.data.redirectTo,
    "success",
    `Backfill completed for ${result.reportCount}/${result.hiredCount} hired application reports. Linked ${result.linkedCount} employee profiles.`,
  );
}
