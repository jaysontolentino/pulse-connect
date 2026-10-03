"use client";

import type { ReactNode } from "react";

interface StatusPillAction {
  label: string;
  onClick: () => void;
}

/** Transient status line: notices, outgoing requests, and waits. */
export default function StatusPill({
  children,
  pending = false,
  action,
}: {
  children: ReactNode;
  pending?: boolean;
  action?: StatusPillAction;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-11 items-center gap-3 rounded-full border border-line bg-surface/90 py-1 text-sm text-foreground shadow-lg backdrop-blur ${
        action ? "pl-4 pr-1" : "px-4"
      }`}
    >
      {pending && (
        <span className="size-2 shrink-0 rounded-full bg-accent motion-safe:animate-pulse" />
      )}
      <span>{children}</span>
      {action && (
        <button
          onClick={action.onClick}
          // The visible chip is 36 px; the pseudo-element pads the hit area to 44 px.
          className="relative h-9 rounded-full bg-raised px-4 text-xs font-medium text-foreground after:absolute after:-inset-1 after:content-[''] hover:bg-line-strong focus-visible:outline-2 focus-visible:outline-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
