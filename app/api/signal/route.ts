import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import { bearerToken, sessionForToken } from "@/lib/session";
import { decideSignal, type PairingDecision } from "@/lib/pairing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024; // SDP/ICE are small; cap to be safe.

// POST /api/signal - bearer token, body { toId, type, payload? }
// Drops one message into the recipient's mailbox. The sender is always the
// token's session, never an id from the body. Signals only flow along a
// pending request or an accepted pairing (lib/pairing.ts), which also keeps a
// user to one connection at a time.
export async function POST(request: NextRequest) {
  const sender = await sessionForToken(bearerToken(request));
  if (!sender) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const fromId = sender.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { toId, type, payload } = (body ?? {}) as Record<string, unknown>;

  if (typeof toId !== "string") {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    payload !== undefined &&
    payload !== null &&
    (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const signalType = type as SignalType;
  const payloadStr = typeof payload === "string" ? payload : null;

  const target = await prisma.presence.findUnique({
    where: { id: toId },
    select: { id: true, busy: true, peerId: true, requestedId: true },
  });
  const decision = decideSignal(signalType, sender, toId, target);

  if (decision.action === "reject") {
    return Response.json({ error: "not paired" }, { status: 409 });
  }
  if (decision.action === "auto-decline") {
    // Offline or busy target: tell the initiator it was declined.
    await sendDecline(toId, fromId);
    return Response.json({ ok: true, autoDeclined: true });
  }
  await applyEffect(decision.effect, fromId, toId);

  await prisma.signal.create({
    data: { fromId, toId, type: signalType, payload: payloadStr },
  });

  return Response.json({ ok: true });
}

// Every write is scoped to the two sessions, and a row is only changed while it
// still points at the other one, so a late signal cannot undo a newer pairing.
async function applyEffect(
  effect: Extract<PairingDecision, { action: "deliver" }>["effect"],
  fromId: string,
  toId: string,
) {
  switch (effect) {
    case "request":
      await prisma.presence.update({
        where: { id: fromId },
        data: { requestedId: toId },
      });
      break;
    case "pair":
      await prisma.$transaction([
        prisma.presence.updateMany({
          where: { id: toId, requestedId: fromId },
          data: { peerId: fromId, requestedId: null, busy: true },
        }),
        prisma.presence.update({
          where: { id: fromId },
          data: { peerId: toId, requestedId: null, busy: true },
        }),
      ]);
      break;
    case "answer-request":
      await prisma.presence.updateMany({
        where: { id: toId, requestedId: fromId },
        data: { requestedId: null },
      });
      break;
    case "unpair":
      await prisma.presence.update({
        where: { id: fromId },
        data: { peerId: null, busy: false },
      });
      await prisma.presence.updateMany({
        where: { id: toId, peerId: fromId },
        data: { peerId: null, busy: false },
      });
      break;
    case "cancel-request":
      await prisma.presence.update({
        where: { id: fromId },
        data: { requestedId: null },
      });
      break;
    case "none":
      break;
  }
}

// Helper: deliver an auto-decline from `target` back to `initiator`.
async function sendDecline(targetId: string, initiatorId: string) {
  await prisma.signal.create({
    data: { fromId: targetId, toId: initiatorId, type: "decline", payload: null },
  });
}
