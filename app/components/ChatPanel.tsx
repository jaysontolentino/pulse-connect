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
    <section
      aria-label="Chat with stranger"
      className="absolute inset-x-0 bottom-0 z-20 flex h-[66dvh] flex-col rounded-t-3xl border-t border-line bg-surface text-foreground shadow-2xl sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-10 sm:h-auto sm:w-96 sm:rounded-3xl sm:border"
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`size-2.5 rounded-full ${
              connected ? "bg-accent" : "bg-muted motion-safe:animate-pulse"
            }`}
          />
          <div>
            <p className="font-semibold">Stranger</p>
            <p className="text-xs text-muted">
              {connected ? "Connected" : "Connecting…"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="flex h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-medium hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="13" height="12" rx="2" />
              <path d="m16 10 5-3v10l-5-3" />
            </svg>
            Video
          </button>
          <button
            onClick={onEnd}
            className="h-11 rounded-full bg-danger px-4 text-sm font-semibold text-white hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-soft"
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
              {connected
                ? "Say hello. Messages are peer-to-peer and never stored."
                : "Opening a private line to the stranger…"}
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap wrap-anywhere ${
                  m.mine
                    ? "rounded-br-md bg-accent text-on-accent"
                    : "rounded-bl-md bg-raised text-foreground"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={submit}
        className="flex gap-2 border-t border-line p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          aria-label="Message"
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-base outline-none placeholder:text-subtle focus:border-accent disabled:opacity-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
