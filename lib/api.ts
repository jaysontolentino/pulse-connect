// Client-side helpers for talking to the coordination API.
import type { JoinResponse, PollResponse, SignalType } from "@/lib/types";

/** Joins the map and returns the session's secret token. */
export async function join(lat: number, lng: number): Promise<string> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) throw new Error(`join failed: ${res.status}`);
  const { token } = (await res.json()) as JoinResponse;
  return token;
}

/** Polls as the session, or anonymously (peers only) before joining. */
export async function poll(token: string | null): Promise<PollResponse> {
  const res = await fetch("/api/poll", {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

export async function sendSignal(
  token: string,
  toId: string,
  type: SignalType,
  payload?: string,
): Promise<void> {
  await fetch("/api/signal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ toId, type, payload }),
  });
}

// Fire-and-forget leave that survives the tab closing. sendBeacon cannot set
// headers, so the token goes in the body.
export function leave(token: string): void {
  const body = JSON.stringify({ token });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/leave", body);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}
