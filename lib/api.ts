// Client-side helpers for talking to the coordination API.
import type {
  DotsResponse,
  JoinResponse,
  PeerDot,
  PollResponse,
  SignalType,
} from "@/lib/types";

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

export async function poll(token: string): Promise<PollResponse> {
  const res = await fetch("/api/poll", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

/**
 * Who is online, for the entry gate. The dots carry no session ids, so they
 * are keyed by position, which is stable between polls and keeps each marker
 * in place.
 */
export async function gateDots(): Promise<PeerDot[]> {
  const res = await fetch("/api/dots", { cache: "no-store" });
  if (!res.ok) throw new Error(`dots failed: ${res.status}`);
  const { dots } = (await res.json()) as DotsResponse;
  return dots.map((dot) => ({ ...dot, id: `${dot.lat},${dot.lng}` }));
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
