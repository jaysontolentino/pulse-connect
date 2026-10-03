import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

// The public id is shown to other users so they can address requests. The
// secret token proves who is calling. Only its hash is stored, so a database
// read never yields a usable token.
export function createSession() {
  const token = randomBytes(32).toString("base64url");
  return { id: randomUUID(), token, tokenHash: hashToken(token) };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bearerToken(request: Request): string | null {
  const match = request.headers.get("authorization")?.match(/^Bearer (\S+)$/);
  return match ? match[1] : null;
}

/** The public id of the session that owns `token`, or null if none does. */
export async function sessionIdForToken(
  token: string | null,
): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.presence.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true },
  });
  return row?.id ?? null;
}
