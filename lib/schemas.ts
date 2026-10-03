import { z } from "zod";
import type { SignalType } from "@/lib/types";

// Session tokens are 32 random bytes, base64url-encoded (lib/session.ts).
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const joinSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const leaveSchema = z.object({ token: tokenSchema });

const SIGNAL_TYPES = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
] as const satisfies readonly SignalType[];

export const signalSchema = z.object({
  toId: z.uuid(),
  type: z.enum(SIGNAL_TYPES),
  // SDP and ICE payloads are a few KB at most.
  payload: z
    .string()
    .max(64 * 1024)
    .nullish(),
});

/**
 * Parses a JSON request body against `schema`, or returns null. Reads the
 * body as text, because sendBeacon may not send a JSON content type.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T | null> {
  let json: unknown;
  try {
    json = JSON.parse(await request.text());
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}
