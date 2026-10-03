"use client";

import { useState } from "react";

export default function EntryGate({
  onReady,
  leaving,
}: {
  onReady: (lat: number, lng: number) => void;
  leaving: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  // A transparent overlay: the spinning globe behind it is the live WorldMap,
  // which flies down to the user as soon as their location arrives. The gate
  // fades out then, rather than waiting for the join request to finish.
  return (
    <div
      aria-hidden={leaving}
      className={`absolute inset-0 z-40 flex flex-col items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)] text-foreground transition-opacity duration-700 motion-reduce:transition-none ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-linear-to-b from-background via-background/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-background via-background/80 to-transparent"
      />

      <div className="relative text-center">
        <h1 className="flex items-center justify-center gap-3 text-5xl font-bold tracking-tight">
          <span className="size-3 rounded-full bg-accent shadow-[0_0_10px_2px_var(--color-accent)] motion-safe:animate-pulse" />
          Pulse
        </h1>
        <p className="mt-3 max-w-sm text-balance text-muted">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <button
          onClick={enter}
          disabled={status === "locating"}
          className="flex h-12 items-center gap-2 rounded-full bg-accent px-8 font-semibold text-on-accent shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] transition hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60"
        >
          {status === "locating" && (
            <span className="size-2 rounded-full bg-on-accent motion-safe:animate-pulse" />
          )}
          {status === "locating" ? "Locating…" : "Enter Pulse"}
        </button>

        {status === "error" && (
          <p
            role="alert"
            className="max-w-sm rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-center text-sm text-danger-soft"
          >
            {error}
          </p>
        )}

        <p className="max-w-xs text-center text-xs leading-relaxed text-muted">
          No sign-up. Your dot is placed 1 to 3&nbsp;km from your real location.
          Nothing is stored, and closing the tab ends everything.
        </p>
      </div>
    </div>
  );
}
