import { prisma } from "@/lib/prisma";
import { STALE_MS } from "@/lib/presence";
import type { DotsResponse } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/dots - read-only view of who is online, for the entry gate.
// Positions are already privacy-offset and public to every participant, but
// session ids are not: they are what a joined session uses to address others.
export async function GET() {
  const rows = await prisma.presence.findMany({
    where: { lastSeen: { gte: new Date(Date.now() - STALE_MS) } },
    select: { lat: true, lng: true, busy: true },
  });

  const response: DotsResponse = { dots: rows };
  return Response.json(response);
}
