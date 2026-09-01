import { StatusBanner } from "@/components/status-banner";
import { requireEmployeeProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createConversationAction, renameConversationAction } from "../actions";
import { ChatWorkspace } from "./chat-workspace";
import { ConversationList } from "./conversation-list";

type EmployeeChatPageProps = {
  searchParams: Promise<{
    conversation?: string;
    error?: string;
    success?: string;
  }>;
};

type ParticipantRecord = {
  profile_id?: string;
  profiles?: { full_name?: string | null; email?: string | null } | Array<{ full_name?: string | null; email?: string | null }> | null;
};

export default async function EmployeeChatPage({ searchParams }: EmployeeChatPageProps) {
  const profile = await requireEmployeeProfile();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  let employees: Array<{ id: string; full_name: string | null; email: string }> = [];
  let conversations: Array<{
    id: string;
    title: string | null;
    kind: "direct" | "group";
    updated_at?: string | null;
    conversation_participants?: ParticipantRecord[] | null;
  }> = [];
  let selectedConversation: {
    id: string;
    title: string | null;
    kind: "direct" | "group";
    updated_at?: string | null;
    conversation_participants?: ParticipantRecord[] | null;
  } | null = null;
  let messages: Array<{
    id: string;
    body: string;
    created_at: string;
    sender_profile_id: string;
    delivered_at: string | null;
    read_at: string | null;
  }> = [];

  if (profile.companyId) {
    const [employeesResult, participantLinksResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("company_id", profile.companyId)
        .neq("id", profile.id)
        .order("full_name"),
      supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", profile.id),
    ]);

    employees = (employeesResult.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string;
    }>;
    const conversationIds = (participantLinksResult.data ?? []).map(
      (item) => item.conversation_id as string,
    );

    const conversationsResult = conversationIds.length
      ? await supabase
          .from("conversations")
          .select(
            "id, title, kind, conversation_participants(profile_id, profiles(full_name, email))",
          )
          .in("id", conversationIds)
          .order("updated_at", { ascending: false })
      : { data: [] };

    conversations = (conversationsResult.data ?? []) as Array<{
      id: string;
      title: string | null;
      kind: "direct" | "group";
      updated_at?: string | null;
      conversation_participants?: ParticipantRecord[] | null;
    }>;

    selectedConversation =
      conversations.find((conversation) => conversation.id === params.conversation) ??
      conversations[0] ??
      null;

    if (selectedConversation) {
      const messagesResult = await supabase
        .from("chat_messages")
        .select("id, body, created_at, sender_profile_id, delivered_at, read_at")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      messages = (messagesResult.data ?? []) as Array<{
        id: string;
        body: string;
        created_at: string;
        sender_profile_id: string;
        delivered_at: string | null;
        read_at: string | null;
      }>;
    }
  }

  const participantDirectory = [
    {
      id: profile.id,
      label: profile.fullName ?? profile.email,
    },
    ...employees.map((employee) => ({
      id: employee.id,
      label: employee.full_name ?? employee.email,
    })),
  ];

  const chatTitle = selectedConversation
    ? selectedConversation.kind === "group"
      ? selectedConversation.title ?? "Group chat"
      : (selectedConversation.conversation_participants ?? [])
          .map((participant) => {
            const profileRecord = Array.isArray(participant.profiles)
              ? participant.profiles[0]
              : participant.profiles;

            if (participant.profile_id === profile.id) {
              return null;
            }

            return profileRecord?.full_name ?? profileRecord?.email ?? "Teammate";
          })
          .filter(Boolean)
          .join(", ") || "Direct chat"
    : "No conversation selected";

  const conversationListItems = conversations.map((conversation) => {
    const title =
      conversation.kind === "group"
        ? conversation.title ?? "Group chat"
        : (conversation.conversation_participants ?? [])
            .map((participant) => {
              const profileRecord = Array.isArray(participant.profiles)
                ? participant.profiles[0]
                : participant.profiles;

              if (participant.profile_id === profile.id) {
                return null;
              }

              return profileRecord?.full_name ?? profileRecord?.email ?? "Teammate";
            })
            .filter(Boolean)
            .join(", ") || "Direct chat";

    return {
      id: conversation.id,
      title,
      kind: conversation.kind,
      updatedAt: conversation.updated_at ?? null,
      active: selectedConversation?.id === conversation.id,
    };
  });

  return (
    <div className="space-y-6">
      <section className="panel rounded-[30px] p-6">
        <span className="eyebrow">Chat</span>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
          One-to-one and group messaging for your company workspace.
        </h2>
        <div className="mt-6">
          <StatusBanner error={params.error} success={params.success} />
        </div>
        {!profile.companyId ? (
          <p className="mt-5 text-sm leading-7 text-amber-700">
            Your employee profile is not linked to a company yet. Ask a company admin to assign you
            before starting chats.
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <div className="panel-strong rounded-[30px] p-6">
            <h3 className="section-title">Conversations</h3>
            {conversationListItems.length === 0 ? (
              <p className="mt-5 text-sm leading-7 text-slate-500">
                No chats yet. Start a direct chat or create a group.
              </p>
            ) : (
              <ConversationList conversations={conversationListItems} />
            )}
          </div>

          <form action={createConversationAction} className="panel-strong rounded-[30px] p-6">
            <input type="hidden" name="kind" value="direct" />
            <input type="hidden" name="redirectTo" value="/dashboard/employee/chat" />
            <h3 className="section-title">Start Direct Chat</h3>
            <div className="mt-5 space-y-4">
              <select
                className="input-base"
                name="participantIds"
                defaultValue=""
                disabled={!profile.companyId}
              >
                <option value="" disabled>
                  Select teammate
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name ?? employee.email}
                  </option>
                ))}
              </select>
              <button className="button-primary w-full" type="submit" disabled={!profile.companyId}>
                Open Direct Chat
              </button>
            </div>
          </form>

          <form action={createConversationAction} className="panel-strong rounded-[30px] p-6">
            <input type="hidden" name="kind" value="group" />
            <input type="hidden" name="redirectTo" value="/dashboard/employee/chat" />
            <h3 className="section-title">Create Group Chat</h3>
            <div className="mt-5 space-y-4">
              <input
                className="input-base"
                name="title"
                placeholder="Group name"
                disabled={!profile.companyId}
              />
              <select
                className="input-base min-h-40"
                name="participantIds"
                multiple
                disabled={!profile.companyId}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name ?? employee.email}
                  </option>
                ))}
              </select>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                Hold Ctrl or Cmd to select multiple teammates.
              </p>
              <button className="button-primary w-full" type="submit" disabled={!profile.companyId}>
                Create Group Chat
              </button>
            </div>
          </form>
        </div>

        {selectedConversation ? (
          <ChatWorkspace
            conversationId={selectedConversation.id}
            currentUserId={profile.id}
            conversationTitle={chatTitle}
            conversationKind={selectedConversation.kind}
            participantDirectory={participantDirectory}
            renameAction={renameConversationAction}
            initialMessages={messages.map((message) => ({
              id: message.id as string,
              body: message.body as string,
              createdAt: message.created_at as string,
              senderProfileId: message.sender_profile_id as string,
              deliveredAt: message.delivered_at as string | null,
              readAt: message.read_at as string | null,
            }))}
          />
        ) : (
          <div className="panel rounded-[30px] p-10 text-center text-sm leading-7 text-slate-500">
            Select a conversation or create a new one to start chatting.
          </div>
        )}
      </section>
    </div>
  );
}
