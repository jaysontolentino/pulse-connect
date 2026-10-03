"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  messages,
  connected,
  videoBusy,
  onSend,
  onStartVideo,
  onEnd,
  status,
}: {
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onEnd: () => void;
  status?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-line bg-background text-foreground shadow-2xl">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold">Stranger</p>
          <p className="text-xs text-muted">
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-muted disabled:opacity-40"
          >
            Video
          </button>
          <button
            onClick={onEnd}
            className="rounded-full bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-hover"
          >
            End
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {status && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
            {status}
          </div>
        )}
        <div className="h-full space-y-2 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="mt-16 text-center text-sm text-muted">
              Say hello. Messages are peer-to-peer and never stored.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.mine
                    ? "bg-accent text-on-accent"
                    : "bg-raised text-foreground"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-full bg-surface px-4 py-2 text-sm outline-none placeholder:text-subtle focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
