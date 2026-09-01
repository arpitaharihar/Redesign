"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

type ConversationListItem = {
  id: string;
  title: string;
  kind: "direct" | "group";
  updatedAt: string | null;
  active: boolean;
};

type ConversationListProps = {
  conversations: ConversationListItem[];
};

function formatTimeline(value: string | null) {
  if (!value) {
    return "No timeline yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ConversationList({ conversations }: ConversationListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const visibleConversations = conversations.filter((conversation) =>
    `${conversation.title} ${conversation.kind}`.toLowerCase().includes(deferredQuery),
  );

  return (
    <>
      <input
        className="input-base mt-5"
        type="search"
        placeholder="Search conversations"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-2">
        {visibleConversations.length === 0 ? (
          <p className="text-sm leading-7 text-slate-500">No matching conversations.</p>
        ) : (
          visibleConversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/dashboard/employee/chat?conversation=${conversation.id}`}
              className={`block rounded-[22px] px-4 py-4 text-sm transition ${
                conversation.active
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200/80 bg-white text-slate-700"
              }`}
            >
              <p className="font-semibold">{conversation.title}</p>
              <p
                className={`mt-2 text-xs uppercase tracking-[0.14em] ${
                  conversation.active ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {conversation.kind === "group" ? "Group chat" : "Direct chat"}
              </p>
              <p className={`mt-2 text-xs ${conversation.active ? "text-slate-300" : "text-slate-400"}`}>
                {formatTimeline(conversation.updatedAt)}
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
