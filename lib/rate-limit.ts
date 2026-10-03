import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// A normal session sends a few dozen signals a minute at most, mostly ICE
// candidates while a call or video starts, so these leave wide headroom.
export const SIGNALS_PER_MINUTE = 120;
export const REQUESTS_PER_MINUTE = 10;
// Mailboxes are drained every poll (1.5 s), so a backlog this deep means the
// recipient is gone or being flooded.
export const MAILBOX_LIMIT = 100;
export const JOINS_PER_MINUTE = 10;

const WINDOW_MS = 60_000;

const BUCKETS = {
  signal: {
    window: "signalWindowAt",
    count: "signalCount",
    limit: SIGNALS_PER_MINUTE,
  },
  request: {
    window: "requestWindowAt",
    count: "requestCount",
    limit: REQUESTS_PER_MINUTE,
  },
} as const;

/**
 * Counts one action against the session's fixed one-minute window and says
 * whether it is within the limit. One statement, so concurrent actions cannot
 * both slip under the limit.
 */
export async function takeSessionSlot(
  id: string,
  bucket: keyof typeof BUCKETS,
): Promise<boolean> {
  const { window, count, limit } = BUCKETS[bucket];
  const windowCol = Prisma.raw(`"${window}"`);
  const countCol = Prisma.raw(`"${count}"`);
  const now = new Date();
  const cutoff = new Date(now.getTime() - WINDOW_MS);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    UPDATE "Presence" SET
      ${countCol} = CASE WHEN ${windowCol} IS NULL OR ${windowCol} < ${cutoff}
        THEN 1 ELSE ${countCol} + 1 END,
      ${windowCol} = CASE WHEN ${windowCol} IS NULL OR ${windowCol} < ${cutoff}
        THEN ${now} ELSE ${windowCol} END
    WHERE "id" = ${id}
    RETURNING ${countCol} AS "count"`;
  return rows.length > 0 && rows[0].count <= limit;
}

export async function mailboxHasRoom(toId: string): Promise<boolean> {
  return (await prisma.signal.count({ where: { toId } })) < MAILBOX_LIMIT;
}

// Joins have no session yet, so they are limited per client address, in
// memory. On serverless each instance keeps its own counts, so this is best
// effort. Addresses are hashed with a per-instance salt, never kept raw.
const joinSalt = randomBytes(16);
const joinWindows = new Map<string, { windowAt: number; count: number }>();

function clientAddress(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
  );
}

export function takeJoinSlot(request: Request): boolean {
  const key = createHash("sha256")
    .update(joinSalt)
    .update(clientAddress(request))
    .digest("hex");
  const now = Date.now();

  if (joinWindows.size > 10_000) {
    for (const [k, w] of joinWindows) {
      if (now - w.windowAt >= WINDOW_MS) joinWindows.delete(k);
    }
  }

  const entry = joinWindows.get(key);
  if (!entry || now - entry.windowAt >= WINDOW_MS) {
    joinWindows.set(key, { windowAt: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= JOINS_PER_MINUTE;
}
