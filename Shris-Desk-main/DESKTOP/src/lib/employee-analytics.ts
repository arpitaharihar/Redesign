import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type EmployeeRecord = {
  id: string;
  full_name: string | null;
  email: string;
  department: string | null;
  face_enrolled: boolean;
  profile_completed: boolean;
  is_active: boolean;
};

type TaskRecord = {
  id: string;
  assignee_profile_id: string | null;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project_id: string | null;
  projects?:
    | { name?: string | null; client_name?: string | null; status?: string | null }
    | Array<{ name?: string | null; client_name?: string | null; status?: string | null }>
    | null;
};

type ProjectMembershipRecord = {
  profile_id: string;
  role_in_project: string;
  project_id: string;
  projects?:
    | { name?: string | null; client_name?: string | null; status?: string | null }
    | Array<{ name?: string | null; client_name?: string | null; status?: string | null }>
    | null;
};

type SubmissionRecord = {
  id: string;
  task_id: string;
  profile_id: string;
  submission_url: string;
  notes: string | null;
  status: "submitted" | "accepted" | "needs_changes" | "rejected";
  feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewer_profile_id: string | null;
};

type AttendanceRecord = {
  id: string;
  profile_id: string;
  attendance_date: string;
  status: "present" | "late" | "absent" | "leave" | "remote";
  check_in_at: string | null;
  check_out_at: string | null;
  work_minutes: number;
  punctuality_score: number;
  notes: string | null;
};

type WorkSessionRecord = {
  id: string;
  profile_id: string;
  project_id: string | null;
  session_date: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  productive_minutes: number;
  idle_minutes: number;
  focus_score: number;
  activity_score: number;
  source: string;
};

type MessageRecord = {
  sender_profile_id: string;
  created_at: string;
};

type MeetingRecord = {
  created_by_profile_id: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
};

export type EmployeeAttendanceDay = {
  date: string;
  status: AttendanceRecord["status"];
  workMinutes: number;
  punctualityScore: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
};

export type EmployeeWorkSession = {
  id: string;
  date: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  productiveMinutes: number;
  idleMinutes: number;
  focusScore: number;
  activityScore: number;
  source: string;
  projectName: string;
};

export type EmployeeSubmissionItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  status: SubmissionRecord["status"];
  createdAt: string;
  reviewedAt: string | null;
  feedback: string | null;
  submissionUrl: string;
  notes: string | null;
};

export type EmployeeProjectMembership = {
  projectId: string;
  projectName: string;
  projectStatus: string;
  clientName: string;
  roleInProject: string;
};

export type EmployeeAnalyticsSummary = {
  profile: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    faceEnrolled: boolean;
    profileCompleted: boolean;
    isActive: boolean;
  };
  performanceScore: number;
  attendanceRate: number;
  totalAttendanceDays: number;
  presentDays: number;
  lateDays: number;
  leaveDays: number;
  totalHours: number;
  avgHoursPerDay: number;
  focusScore: number;
  activityScore: number;
  punctualityScore: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  overdueTasks: number;
  criticalTasks: number;
  activeProjects: number;
  collaborationCount: number;
  submissionCount: number;
  reviewedSubmissions: number;
  acceptedSubmissions: number;
  needsChangesSubmissions: number;
  rejectedSubmissions: number;
  pendingReviewSubmissions: number;
  submissionAcceptanceRate: number;
  recentAttendance: EmployeeAttendanceDay[];
  recentSessions: EmployeeWorkSession[];
  recentSubmissions: EmployeeSubmissionItem[];
  projectMemberships: EmployeeProjectMembership[];
  headline: string;
};

export type CompanyAnalyticsOverview = {
  employeeCount: number;
  avgPerformanceScore: number;
  avgAttendanceRate: number;
  avgHoursPerDay: number;
  avgAcceptanceRate: number;
  totalPendingReviews: number;
  totalOverdueTasks: number;
  activeProjectCount: number;
  topPerformers: EmployeeAnalyticsSummary[];
  attentionNeeded: EmployeeAnalyticsSummary[];
};

export type CompanyAnalyticsBundle = {
  employees: EmployeeAnalyticsSummary[];
  overview: CompanyAnalyticsOverview;
  reviewQueue: Array<
    EmployeeSubmissionItem & {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      taskPriority: string;
      taskStatus: string;
      dueDate: string | null;
      projectName: string;
    }
  >;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safePercent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function average(numbers: number[]) {
  if (!numbers.length) {
    return 0;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function groupByProfileId<T extends { profile_id: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.profile_id]) {
      acc[item.profile_id] = [];
    }
    acc[item.profile_id].push(item);
    return acc;
  }, {});
}

function groupBySenderId<T extends { sender_profile_id: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.sender_profile_id]) {
      acc[item.sender_profile_id] = [];
    }
    acc[item.sender_profile_id].push(item);
    return acc;
  }, {});
}

function groupByCreatorId<T extends { created_by_profile_id: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    if (!acc[item.created_by_profile_id]) {
      acc[item.created_by_profile_id] = [];
    }
    acc[item.created_by_profile_id].push(item);
    return acc;
  }, {});
}

function groupTasksByAssignee(tasks: TaskRecord[]) {
  return tasks.reduce<Record<string, TaskRecord[]>>((acc, task) => {
    if (!task.assignee_profile_id) {
      return acc;
    }

    if (!acc[task.assignee_profile_id]) {
      acc[task.assignee_profile_id] = [];
    }
    acc[task.assignee_profile_id].push(task);
    return acc;
  }, {});
}

function normalizeProjectRecord<T extends { name?: string | null; client_name?: string | null; status?: string | null }>(
  project:
    | T
    | Array<T>
    | null
    | undefined,
) {
  return Array.isArray(project) ? project[0] : project;
}

function buildHeadline(summary: Omit<EmployeeAnalyticsSummary, "headline">) {
  if (summary.performanceScore >= 85 && summary.overdueTasks === 0) {
    return "Strong delivery momentum with healthy attendance and review quality.";
  }

  if (summary.pendingReviewSubmissions >= 2) {
    return "Work is moving, but submission reviews are stacking up and need action.";
  }

  if (summary.overdueTasks > 0 || summary.attendanceRate < 80) {
    return "Needs support on delivery discipline, attendance consistency, or overdue execution.";
  }

  return "Balanced operating pattern with room to improve review quality and throughput.";
}

function buildEmployeeSummary(input: {
  employee: EmployeeRecord;
  tasks: TaskRecord[];
  projectMemberships: ProjectMembershipRecord[];
  submissions: SubmissionRecord[];
  attendance: AttendanceRecord[];
  sessions: WorkSessionRecord[];
  messages: MessageRecord[];
  meetings: MeetingRecord[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = [...input.tasks].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const submissions = [...input.submissions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const attendance = [...input.attendance].sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  const sessions = [...input.sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const projectMemberships = input.projectMemberships.map((membership) => {
    const project = normalizeProjectRecord(membership.projects);
    return {
      projectId: membership.project_id,
      projectName: project?.name ?? "Unassigned project",
      projectStatus: project?.status ?? "unknown",
      clientName: project?.client_name ?? "Internal",
      roleInProject: membership.role_in_project,
    };
  });
  const projectNameById = new Map(
    projectMemberships.map((membership) => [membership.projectId, membership.projectName] as const),
  );

  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const presentDays = attendance.filter((day) =>
    ["present", "late", "remote"].includes(day.status),
  ).length;
  const lateDays = attendance.filter((day) => day.status === "late").length;
  const leaveDays = attendance.filter((day) => day.status === "leave").length;
  const totalHours = roundToOne(attendance.reduce((sum, day) => sum + day.work_minutes, 0) / 60);
  const avgHoursPerDay = roundToOne(
    presentDays ? attendance.reduce((sum, day) => sum + day.work_minutes, 0) / presentDays / 60 : 0,
  );
  const attendanceRate = safePercent(presentDays, attendance.length);
  const punctualityScore = Math.round(average(attendance.map((day) => day.punctuality_score)));
  const focusScore = Math.round(average(sessions.map((session) => session.focus_score)));
  const activityScore = Math.round(average(sessions.map((session) => session.activity_score)));

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
  const reviewTasks = tasks.filter((task) => task.status === "review").length;
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date) {
      return false;
    }

    return task.due_date < today && task.status !== "done";
  }).length;
  const criticalTasks = tasks.filter((task) => ["high", "critical"].includes(task.priority)).length;

  const reviewedSubmissions = submissions.filter((submission) => submission.status !== "submitted").length;
  const acceptedSubmissions = submissions.filter((submission) => submission.status === "accepted").length;
  const needsChangesSubmissions = submissions.filter(
    (submission) => submission.status === "needs_changes",
  ).length;
  const rejectedSubmissions = submissions.filter((submission) => submission.status === "rejected").length;
  const pendingReviewSubmissions = submissions.filter(
    (submission) => submission.status === "submitted",
  ).length;
  const submissionAcceptanceRate = reviewedSubmissions
    ? safePercent(acceptedSubmissions, reviewedSubmissions)
    : 0;

  const completionRatio = tasks.length ? safePercent(completedTasks, tasks.length) : 0;
  const reviewQualityScore = reviewedSubmissions
    ? submissionAcceptanceRate
    : submissions.length > 0
      ? 68
      : 72;
  const collaborationCount = input.messages.length + input.meetings.length * 2;
  const collaborationScore = clamp(collaborationCount * 9, 20, 100);
  const workQualityScore = sessions.length
    ? Math.round((focusScore + activityScore + punctualityScore) / 3)
    : 72;
  const performanceScore = Math.round(
    clamp(
      attendanceRate * 0.28 +
        completionRatio * 0.22 +
        reviewQualityScore * 0.22 +
        workQualityScore * 0.18 +
        collaborationScore * 0.1,
      0,
      100,
    ),
  );

  const summaryWithoutHeadline = {
    profile: {
      id: input.employee.id,
      name: input.employee.full_name ?? input.employee.email,
      email: input.employee.email,
      department: input.employee.department,
      faceEnrolled: input.employee.face_enrolled,
      profileCompleted: input.employee.profile_completed,
      isActive: input.employee.is_active,
    },
    performanceScore,
    attendanceRate,
    totalAttendanceDays: attendance.length,
    presentDays,
    lateDays,
    leaveDays,
    totalHours,
    avgHoursPerDay,
    focusScore,
    activityScore,
    punctualityScore,
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    reviewTasks,
    overdueTasks,
    criticalTasks,
    activeProjects: uniqueCount(projectMemberships.map((membership) => membership.projectId)),
    collaborationCount,
    submissionCount: submissions.length,
    reviewedSubmissions,
    acceptedSubmissions,
    needsChangesSubmissions,
    rejectedSubmissions,
    pendingReviewSubmissions,
    submissionAcceptanceRate,
    recentAttendance: attendance.slice(0, 10).map((day) => ({
      date: day.attendance_date,
      status: day.status,
      workMinutes: day.work_minutes,
      punctualityScore: day.punctuality_score,
      checkInAt: day.check_in_at,
      checkOutAt: day.check_out_at,
      notes: day.notes,
    })),
    recentSessions: sessions.slice(0, 8).map((session) => ({
      id: session.id,
      date: session.session_date,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationMinutes: session.duration_minutes,
      productiveMinutes: session.productive_minutes,
      idleMinutes: session.idle_minutes,
      focusScore: session.focus_score,
      activityScore: session.activity_score,
      source: session.source,
      projectName: projectNameById.get(session.project_id ?? "") ?? "General work",
    })),
    recentSubmissions: submissions.slice(0, 8).map((submission) => ({
      id: submission.id,
      taskId: submission.task_id,
      taskTitle: taskById.get(submission.task_id)?.title ?? "Task submission",
      status: submission.status,
      createdAt: submission.created_at,
      reviewedAt: submission.reviewed_at,
      feedback: submission.feedback,
      submissionUrl: submission.submission_url,
      notes: submission.notes,
    })),
    projectMemberships,
  };

  return {
    ...summaryWithoutHeadline,
    headline: buildHeadline(summaryWithoutHeadline),
  } satisfies EmployeeAnalyticsSummary;
}

async function fetchCompanyAnalyticsSource(companyId: string) {
  const supabase = await createSupabaseServerClient();
  const employeesResult = await supabase
    .from("profiles")
    .select("id, full_name, email, department, face_enrolled, profile_completed, is_active")
    .eq("company_id", companyId)
    .eq("role", "employee")
    .order("full_name");

  const employees = (employeesResult.data ?? []) as EmployeeRecord[];
  const employeeIds = employees.map((employee) => employee.id);

  if (employeeIds.length === 0) {
    return {
      employees,
      tasks: [] as TaskRecord[],
      projectMemberships: [] as ProjectMembershipRecord[],
      submissions: [] as SubmissionRecord[],
      attendance: [] as AttendanceRecord[],
      sessions: [] as WorkSessionRecord[],
      messages: [] as MessageRecord[],
      meetings: [] as MeetingRecord[],
    };
  }

  const [
    tasksResult,
    projectMembershipsResult,
    submissionsResult,
    attendanceResult,
    sessionsResult,
    messagesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, assignee_profile_id, title, status, priority, due_date, created_at, project_id, projects(name, client_name, status)")
      .eq("company_id", companyId)
      .in("assignee_profile_id", employeeIds),
    supabase
      .from("project_members")
      .select("profile_id, role_in_project, project_id, projects(name, client_name, status)")
      .eq("company_id", companyId)
      .in("profile_id", employeeIds),
    supabase
      .from("task_submissions")
      .select("id, task_id, profile_id, submission_url, notes, status, feedback, created_at, reviewed_at, reviewer_profile_id")
      .in("profile_id", employeeIds),
    supabase
      .from("employee_attendance")
      .select("id, profile_id, attendance_date, status, check_in_at, check_out_at, work_minutes, punctuality_score, notes")
      .eq("company_id", companyId)
      .in("profile_id", employeeIds)
      .order("attendance_date", { ascending: false }),
    supabase
      .from("employee_work_sessions")
      .select("id, profile_id, project_id, session_date, started_at, ended_at, duration_minutes, productive_minutes, idle_minutes, focus_score, activity_score, source")
      .eq("company_id", companyId)
      .in("profile_id", employeeIds)
      .order("started_at", { ascending: false }),
    supabase
      .from("chat_messages")
      .select("sender_profile_id, created_at")
      .in("sender_profile_id", employeeIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("created_by_profile_id, status, scheduled_for, created_at")
      .eq("company_id", companyId)
      .in("created_by_profile_id", employeeIds)
      .order("created_at", { ascending: false }),
  ]);

  return {
    employees,
    tasks: (tasksResult.data ?? []) as TaskRecord[],
    projectMemberships: (projectMembershipsResult.data ?? []) as ProjectMembershipRecord[],
    submissions: (submissionsResult.data ?? []) as SubmissionRecord[],
    attendance: (attendanceResult.data ?? []) as AttendanceRecord[],
    sessions: (sessionsResult.data ?? []) as WorkSessionRecord[],
    messages: (messagesResult.data ?? []) as MessageRecord[],
    meetings: (meetingsResult.data ?? []) as MeetingRecord[],
  };
}

async function fetchEmployeeAnalyticsSource(companyId: string, employeeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: employee } = await supabase
    .from("profiles")
    .select("id, full_name, email, department, face_enrolled, profile_completed, is_active")
    .eq("company_id", companyId)
    .eq("role", "employee")
    .eq("id", employeeId)
    .maybeSingle();

  if (!employee) {
    return null;
  }

  const [
    tasksResult,
    membershipsResult,
    submissionsResult,
    attendanceResult,
    sessionsResult,
    messagesResult,
    meetingsResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, assignee_profile_id, title, status, priority, due_date, created_at, project_id, projects(name, client_name, status)")
      .eq("company_id", companyId)
      .eq("assignee_profile_id", employeeId),
    supabase
      .from("project_members")
      .select("profile_id, role_in_project, project_id, projects(name, client_name, status)")
      .eq("company_id", companyId)
      .eq("profile_id", employeeId),
    supabase
      .from("task_submissions")
      .select("id, task_id, profile_id, submission_url, notes, status, feedback, created_at, reviewed_at, reviewer_profile_id")
      .eq("profile_id", employeeId),
    supabase
      .from("employee_attendance")
      .select("id, profile_id, attendance_date, status, check_in_at, check_out_at, work_minutes, punctuality_score, notes")
      .eq("company_id", companyId)
      .eq("profile_id", employeeId)
      .order("attendance_date", { ascending: false }),
    supabase
      .from("employee_work_sessions")
      .select("id, profile_id, project_id, session_date, started_at, ended_at, duration_minutes, productive_minutes, idle_minutes, focus_score, activity_score, source")
      .eq("company_id", companyId)
      .eq("profile_id", employeeId)
      .order("started_at", { ascending: false }),
    supabase
      .from("chat_messages")
      .select("sender_profile_id, created_at")
      .eq("sender_profile_id", employeeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("created_by_profile_id, status, scheduled_for, created_at")
      .eq("company_id", companyId)
      .eq("created_by_profile_id", employeeId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    employee: employee as EmployeeRecord,
    tasks: (tasksResult.data ?? []) as TaskRecord[],
    projectMemberships: (membershipsResult.data ?? []) as ProjectMembershipRecord[],
    submissions: (submissionsResult.data ?? []) as SubmissionRecord[],
    attendance: (attendanceResult.data ?? []) as AttendanceRecord[],
    sessions: (sessionsResult.data ?? []) as WorkSessionRecord[],
    messages: (messagesResult.data ?? []) as MessageRecord[],
    meetings: (meetingsResult.data ?? []) as MeetingRecord[],
  };
}

export const getCompanyAnalyticsBundle = cache(async (companyId: string): Promise<CompanyAnalyticsBundle> => {
  const source = await fetchCompanyAnalyticsSource(companyId);
  const tasksByAssignee = groupTasksByAssignee(source.tasks);
  const membershipsByProfile = groupByProfileId(source.projectMemberships);
  const submissionsByProfile = groupByProfileId(source.submissions);
  const attendanceByProfile = groupByProfileId(source.attendance);
  const sessionsByProfile = groupByProfileId(source.sessions);
  const messagesByProfile = groupBySenderId(source.messages);
  const meetingsByProfile = groupByCreatorId(source.meetings);
  const employees = source.employees
    .map((employee) =>
      buildEmployeeSummary({
        employee,
        tasks: tasksByAssignee[employee.id] ?? [],
        projectMemberships: membershipsByProfile[employee.id] ?? [],
        submissions: submissionsByProfile[employee.id] ?? [],
        attendance: attendanceByProfile[employee.id] ?? [],
        sessions: sessionsByProfile[employee.id] ?? [],
        messages: messagesByProfile[employee.id] ?? [],
        meetings: meetingsByProfile[employee.id] ?? [],
      }),
    )
    .sort((a, b) => b.performanceScore - a.performanceScore);

  const taskById = new Map(source.tasks.map((task) => [task.id, task] as const));
  const employeeById = new Map(employees.map((employee) => [employee.profile.id, employee] as const));
  const reviewQueue = source.submissions
    .filter((submission) => submission.status === "submitted")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((submission) => {
      const employee = employeeById.get(submission.profile_id);
      const task = taskById.get(submission.task_id);
      const project = normalizeProjectRecord(task?.projects);

      return {
        id: submission.id,
        taskId: submission.task_id,
        taskTitle: task?.title ?? "Task submission",
        status: submission.status,
        createdAt: submission.created_at,
        reviewedAt: submission.reviewed_at,
        feedback: submission.feedback,
        submissionUrl: submission.submission_url,
        notes: submission.notes,
        employeeId: submission.profile_id,
        employeeName: employee?.profile.name ?? "Employee",
        employeeEmail: employee?.profile.email ?? "",
        taskPriority: task?.priority ?? "medium",
        taskStatus: task?.status ?? "review",
        dueDate: task?.due_date ?? null,
        projectName: project?.name ?? "General work",
      };
    });

  const overview: CompanyAnalyticsOverview = {
    employeeCount: employees.length,
    avgPerformanceScore: Math.round(average(employees.map((employee) => employee.performanceScore))),
    avgAttendanceRate: Math.round(average(employees.map((employee) => employee.attendanceRate))),
    avgHoursPerDay: roundToOne(average(employees.map((employee) => employee.avgHoursPerDay))),
    avgAcceptanceRate: Math.round(
      average(
        employees.map((employee) =>
          employee.reviewedSubmissions ? employee.submissionAcceptanceRate : 72,
        ),
      ),
    ),
    totalPendingReviews: employees.reduce(
      (sum, employee) => sum + employee.pendingReviewSubmissions,
      0,
    ),
    totalOverdueTasks: employees.reduce((sum, employee) => sum + employee.overdueTasks, 0),
    activeProjectCount: uniqueCount(
      employees.flatMap((employee) => employee.projectMemberships.map((project) => project.projectId)),
    ),
    topPerformers: employees.slice(0, 3),
    attentionNeeded: employees
      .filter(
        (employee) =>
          employee.performanceScore < 70 ||
          employee.attendanceRate < 80 ||
          employee.overdueTasks > 0 ||
          employee.pendingReviewSubmissions > 1,
      )
      .slice(0, 6),
  };

  return {
    employees,
    overview,
    reviewQueue,
  };
});

export const getEmployeeAnalytics = cache(async (companyId: string, employeeId: string) => {
  const source = await fetchEmployeeAnalyticsSource(companyId, employeeId);
  if (!source) {
    return null;
  }

  return buildEmployeeSummary({
    employee: source.employee,
    tasks: source.tasks,
    projectMemberships: source.projectMemberships,
    submissions: source.submissions,
    attendance: source.attendance,
    sessions: source.sessions,
    messages: source.messages,
    meetings: source.meetings,
  });
});
