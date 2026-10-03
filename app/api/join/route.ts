import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset } from "@/lib/geo";
import { joinSchema, parseBody } from "@/lib/schemas";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/join - body { lat, lng } (raw coords). Returns { token }.
// Applies a 1 to 3 km privacy offset and creates the presence row under a
// server-issued id. Raw coordinates are never stored.
export async function POST(request: NextRequest) {
  const body = await parseBody(request, joinSchema);
  if (!body) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const offset = applyPrivacyOffset(body.lat, body.lng);
  const session = createSession();

  await prisma.presence.create({
    data: {
      id: session.id,
      tokenHash: session.tokenHash,
      lat: offset.lat,
      lng: offset.lng,
      busy: false,
      lastSeen: new Date(),
    },
  });

  return Response.json({ token: session.token });
}
