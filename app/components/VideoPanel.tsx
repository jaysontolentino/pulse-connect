"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaFlags, MediaKind } from "@/lib/webrtc";

type Glyph = "mic" | "mic-off" | "camera" | "camera-off" | "close";

export default function VideoPanel({
  localStream,
  remoteStream,
  localMedia,
  remoteMedia,
  onToggleMedia,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localMedia: MediaFlags;
  remoteMedia: MediaFlags;
  onToggleMedia: (kind: MediaKind) => void;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  // The remote stream exists from the moment the chat connects, so only the
  // first decoded frame shows that the stranger's video has arrived.
  const [remoteLive, setRemoteLive] = useState(false);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Every layer is absolutely positioned, so the remote stream's native size
  // can never push the controls off screen.
  return (
    <section
      aria-label="Video call"
      className="absolute inset-0 z-30 overflow-hidden bg-black"
    >
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        onLoadedData={() => setRemoteLive(true)}
        className="absolute inset-0 h-full w-full bg-surface object-cover"
      />
      {!remoteMedia.camera ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface text-sm text-muted">
          <Icon glyph="camera-off" className="size-8" />
          Stranger&rsquo;s camera is off
        </div>
      ) : (
        !remoteLive && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted">
            <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />
            Waiting for stranger&rsquo;s video…
          </div>
        )
      )}

      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
        <span className="size-2 rounded-full bg-accent" />
        Stranger
        {!remoteMedia.mic && (
          <>
            <Icon glyph="mic-off" className="size-3.5 text-danger-soft" />
            <span className="sr-only">is muted</span>
          </>
        )}
      </div>

      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-4 aspect-3/4 w-24 overflow-hidden rounded-2xl border border-line-strong bg-raised shadow-2xl sm:w-40">
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          aria-label="Your camera"
          className="h-full w-full -scale-x-100 object-cover"
        />
        {!localMedia.camera && (
          <div className="absolute inset-0 grid place-items-center bg-raised text-muted">
            <Icon glyph="camera-off" className="size-6" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-linear-to-t from-black/70 to-transparent px-4 pt-16 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <MediaToggle
          on={localMedia.mic}
          label="Mute microphone"
          glyphs={["mic", "mic-off"]}
          onClick={() => onToggleMedia("mic")}
        />
        <button
          onClick={onEnd}
          className="flex h-14 items-center gap-2 rounded-full bg-danger px-7 font-semibold text-white shadow-lg hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-soft"
        >
          <Icon glyph="close" className="size-5" />
          End video
        </button>
        <MediaToggle
          on={localMedia.camera}
          label="Turn camera off"
          glyphs={["camera", "camera-off"]}
          onClick={() => onToggleMedia("camera")}
        />
      </div>
    </section>
  );
}

// Pressed means the device is off, so the label reads as the action taken.
function MediaToggle({
  on,
  label,
  glyphs,
  onClick,
}: {
  on: boolean;
  label: string;
  glyphs: [Glyph, Glyph];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={!on}
      className={`grid size-14 place-items-center rounded-full shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        on
          ? "border border-line-strong bg-surface/70 text-foreground backdrop-blur hover:border-muted"
          : "bg-foreground text-background"
      }`}
    >
      <Icon glyph={on ? glyphs[0] : glyphs[1]} className="size-6" />
    </button>
  );
}

function Icon({ glyph, className }: { glyph: Glyph; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph === "mic" && (
        <>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
        </>
      )}
      {glyph === "mic-off" && (
        <path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 11v-1m14 0v1a7 7 0 0 1-.11 1.23M12 18v4" />
      )}
      {glyph === "camera" && (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3" />
        </>
      )}
      {glyph === "camera-off" && (
        <path d="M3 3l18 18M16 16v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m4 0h3a2 2 0 0 1 2 2v3.34l5-3.34v10" />
      )}
      {glyph === "close" && <path d="M18 6 6 18M6 6l12 12" />}
    </svg>
  );
}
