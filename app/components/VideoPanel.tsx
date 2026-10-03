"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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
      {!remoteLive && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted">
          <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />
          Waiting for stranger&rsquo;s video…
        </div>
      )}

      <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-4 flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
        <span className="size-2 rounded-full bg-accent" />
        Stranger
      </div>

      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        aria-label="Your camera"
        className="absolute top-[calc(env(safe-area-inset-top)+1rem)] right-4 aspect-3/4 w-24 -scale-x-100 rounded-2xl border border-line-strong bg-raised object-cover shadow-2xl sm:w-40"
      />

      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-black/70 to-transparent px-4 pt-16 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <button
          onClick={onEnd}
          className="flex h-14 items-center gap-2 rounded-full bg-danger px-7 font-semibold text-white shadow-lg hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-soft"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" />
            <path d="M16 16v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m4 0h3a2 2 0 0 1 2 2v3.34l5-3.34v10" />
          </svg>
          End video
        </button>
      </div>
    </section>
  );
}
