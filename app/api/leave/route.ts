import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionIdForToken } from "@/lib/session";
import { leaveSchema, parseBody } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave - body { token }. Removes the caller's presence row and any
// pending signals to/from them. Called via navigator.sendBeacon on tab close,
// which cannot set headers, so the token travels in the body.
export async function POST(request: NextRequest) {
  const body = await parseBody(request, leaveSchema);
  if (!body) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const id = await sessionIdForToken(body.token);
  if (!id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Independent cleanup deletes — no atomicity needed (and interactive
  // transactions are unreliable over a PgBouncer pooler).
  await prisma.signal.deleteMany({
    where: { OR: [{ toId: id }, { fromId: id }] },
  });
  await prisma.presence.deleteMany({ where: { id } });

  return Response.json({ ok: true });
}
