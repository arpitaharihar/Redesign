import Link from "next/link";

import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createMeetingAction } from "../actions";

type EmployeeMeetingsPageProps = {
  searchParams: Promise<{
    meeting?: string;
    room?: string;
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Instant";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function EmployeeMeetingsPage({
  searchParams,
}: EmployeeMeetingsPageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  let meetings: Array<{
    id: string;
    title: string;
    description: string | null;
    room_code: string;
    status: string;
    scheduled_for: string | null;
    created_at: string;
  }> = [];

  if (profile.companyId) {
    const { data } = await supabase
      .from("meetings")
      .select("id, title, description, room_code, status, scheduled_for, created_at")
      .eq("company_id", profile.companyId)
      .order("created_at", { ascending: false });

    meetings = (data ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      room_code: string;
      status: string;
      scheduled_for: string | null;
      created_at: string;
    }>;
  }

  const selectedMeeting =
    meetings.find((meeting) => meeting.id === params.meeting) ?? meetings[0] ?? null;
  const instantRoomCode = params.room?.trim() || null;
  const activeRoomCode = instantRoomCode || selectedMeeting?.room_code || null;
  const activeRoomTitle = instantRoomCode
    ? `Instant Room: ${instantRoomCode}`
    : selectedMeeting?.title ?? null;
  const activeRoomDescription = instantRoomCode
    ? "Instant room launched directly from the employee workspace."
    : selectedMeeting?.description ?? null;

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Meetings</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          In-app video rooms for team calls and collaboration.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Your employee profile is not linked to a company yet. Ask a company admin to assign you
            to enable scheduled meeting rooms.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <div className="panel-strong rounded-[30px] p-6">
            <h3 className="section-title">Meeting Rooms</h3>
            <div className="mt-5 space-y-3">
              {meetings.length === 0 ? (
                <p className="text-sm leading-7 text-slate-500">
                  No meetings yet. Start an instant room or schedule one.
                </p>
              ) : (
                meetings.map((meeting) => {
                  const active = selectedMeeting?.id === meeting.id;

                  return (
                    <Link
                      key={meeting.id}
                      href={`/dashboard/employee/meetings?meeting=${meeting.id}`}
                      className={`block rounded-[22px] px-4 py-4 text-sm transition ${
                        active
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200/80 bg-white text-slate-700"
                      }`}
                    >
                      <p className="font-semibold">{meeting.title}</p>
                      <p className={`mt-2 text-xs uppercase tracking-[0.14em] ${active ? "text-slate-300" : "text-slate-400"}`}>
                        {meeting.status} | {formatDate(meeting.scheduled_for)}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <form action={createMeetingAction} className="panel-strong rounded-[30px] p-6">
            <input type="hidden" name="redirectTo" value="/dashboard/employee/meetings" />
            <h3 className="section-title">Create Meeting Room</h3>
            <div className="mt-5 space-y-4">
              <input
                className="input-base"
                name="title"
                placeholder="Meeting title"
                disabled={!profile.companyId}
              />
              <textarea
                className="input-base min-h-24"
                name="description"
                placeholder="Description or agenda"
                disabled={!profile.companyId}
              />
              <input
                className="input-base"
                type="datetime-local"
                name="scheduledFor"
                disabled={!profile.companyId}
              />
              <button
                className="button-primary w-full"
                type="submit"
                disabled={!profile.companyId}
              >
                Create Room
              </button>
            </div>
          </form>

          <form className="panel-strong rounded-[30px] p-6" method="get">
            <h3 className="section-title">Start Instant Room</h3>
            <div className="mt-5 space-y-4">
              <input className="input-base" name="room" placeholder="Enter room code" />
              <button className="button-primary w-full" type="submit">
                Launch Instant Room
              </button>
            </div>
          </form>
        </div>

        {activeRoomCode ? (
          <div className="space-y-6">
            <div className="panel rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                Active Room
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {activeRoomTitle}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {activeRoomDescription ?? "No meeting description"}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>Room code: {activeRoomCode}</span>
                {selectedMeeting ? <span>Status: {selectedMeeting.status}</span> : null}
                {selectedMeeting ? (
                  <span>Time: {formatDate(selectedMeeting.scheduled_for)}</span>
                ) : null}
              </div>
            </div>

            <div className="panel overflow-hidden rounded-[30px] p-3">
              <iframe
                title={activeRoomTitle ?? "Meeting room"}
                src={`https://meet.jit.si/${activeRoomCode}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
                className="h-[680px] w-full rounded-[24px] border-0 bg-slate-950"
                allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write"
              />
            </div>
          </div>
        ) : (
          <div className="panel rounded-[30px] p-10 text-center text-sm leading-7 text-slate-500">
            Create a room to launch an in-app meeting experience.
          </div>
        )}
      </section>
    </div>
  );
}
