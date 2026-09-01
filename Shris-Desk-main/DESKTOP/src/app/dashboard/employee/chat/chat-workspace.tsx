"use client";

import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderProfileId: string;
  deliveredAt: string | null;
  readAt: string | null;
};

type ParticipantDirectoryEntry = {
  id: string;
  label: string;
};

type ChatWorkspaceProps = {
  conversationId: string;
  currentUserId: string;
  conversationTitle: string;
  conversationKind: "direct" | "group";
  initialMessages: ChatMessage[];
  participantDirectory: ParticipantDirectoryEntry[];
  renameAction: (formData: FormData) => void;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatWorkspace({
  conversationId,
  currentUserId,
  conversationTitle,
  conversationKind,
  initialMessages,
  participantDirectory,
  renameAction,
}: ChatWorkspaceProps) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const nextMessage = payload.new as {
            id: string;
            body: string;
            created_at: string;
            sender_profile_id: string;
            delivered_at: string | null;
            read_at: string | null;
          };

          setMessages((current) => {
            if (current.some((message) => message.id === nextMessage.id)) {
              return current;
            }

            return [
              ...current,
              {
                id: nextMessage.id,
                body: nextMessage.body,
                createdAt: nextMessage.created_at,
                senderProfileId: nextMessage.sender_profile_id,
                deliveredAt: nextMessage.delivered_at,
                readAt: nextMessage.read_at,
              },
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const nextMessage = payload.new as {
            id: string;
            delivered_at: string | null;
            read_at: string | null;
          };

          setMessages((current) =>
            current.map((message) =>
              message.id === nextMessage.id
                ? {
                    ...message,
                    deliveredAt: nextMessage.delivered_at,
                    readAt: nextMessage.read_at,
                  }
                : message,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    void supabase.rpc("mark_conversation_read_public", {
      target_conversation_id: conversationId,
    });
  }, [conversationId, messages.length, supabase]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function handleSendMessage() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    setIsSending(true);
    setError(null);

    const { data, error: sendError } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_profile_id: currentUserId,
        body: trimmedDraft,
        delivered_at: new Date().toISOString(),
      })
      .select("id, body, created_at, sender_profile_id, delivered_at, read_at")
      .single();

    if (sendError) {
      setError(sendError.message);
      setIsSending(false);
      return;
    }

    setMessages((current) => {
      if (current.some((message) => message.id === data.id)) {
        return current;
      }

      return [
        ...current,
        {
          id: data.id,
          body: data.body,
          createdAt: data.created_at,
          senderProfileId: data.sender_profile_id,
          deliveredAt: data.delivered_at,
          readAt: data.read_at,
        },
      ];
    });
    setDraft("");
    setIsSending(false);
  }

  return (
    <div className="panel rounded-[30px] p-6">
      <div className="border-b border-slate-200/80 pb-4">
        <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Active Chat</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {conversationTitle}
          </h3>
          {conversationKind === "group" ? (
            <form action={renameAction} className="flex w-full gap-2 lg:max-w-md">
              <input type="hidden" name="conversationId" value={conversationId} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/dashboard/employee/chat?conversation=${conversationId}`}
              />
              <input
                className="input-base"
                name="title"
                defaultValue={conversationTitle}
                placeholder="Group name"
              />
              <button className="button-secondary shrink-0" type="submit">
                Rename
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div
        ref={messageListRef}
        className="mt-5 flex h-[520px] min-h-[420px] flex-col gap-4 overflow-y-auto rounded-[24px] bg-white/60 p-4"
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-sm text-center text-sm leading-7 text-slate-500">
            No messages yet. Start the conversation here.
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.senderProfileId === currentUserId;
            const sender =
              participantDirectory.find((entry) => entry.id === message.senderProfileId)?.label ??
              "Teammate";

            return (
              <div
                key={message.id}
                className={`max-w-[78%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm ${
                  mine
                    ? "ml-auto bg-slate-950 text-white"
                    : "bg-white text-slate-700"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${mine ? "text-slate-300" : "text-slate-400"}`}>
                  {mine ? "You" : sender}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                <p className={`mt-2 text-xs ${mine ? "text-slate-300" : "text-slate-400"}`}>
                  {formatTime(message.createdAt)}
                  {mine ? (
                    <span className="ml-2">
                      {message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}
                    </span>
                  ) : null}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 space-y-3">
        <textarea
          className="input-base min-h-24"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="button-primary w-full"
          type="button"
          onClick={handleSendMessage}
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </div>
  );
}
