"use client";

import { useId } from "react";

type PromptIcon = "connect" | "video";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  icon,
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  icon: PromptIcon;
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const titleId = useId();

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xs rounded-3xl border border-line bg-surface p-6 text-center text-foreground shadow-2xl"
      >
        <div className="relative mx-auto grid size-20 place-items-center">
          <span className="absolute inset-0 rounded-full bg-accent/30 motion-safe:animate-ping" />
          <span className="relative grid size-20 place-items-center rounded-full bg-raised text-accent ring-2 ring-accent">
            <PromptGlyph icon={icon} />
          </span>
        </div>
        <h2 id={titleId} className="mt-6 text-lg font-semibold">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onDecline}
            className="h-12 flex-1 rounded-full border border-line-strong text-sm font-medium text-foreground hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="h-12 flex-1 rounded-full bg-accent text-sm font-semibold text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PromptGlyph({ icon }: { icon: PromptIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-8"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icon === "video" ? (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
        </>
      )}
    </svg>
  );
}
