import type { SignalType } from "@/lib/types";

export interface PairingState {
  id: string;
  busy: boolean;
  peerId: string | null;
  requestedId: string | null;
}

export type PairingDecision =
  | { action: "reject" }
  | { action: "auto-decline" }
  | {
      action: "deliver";
      effect:
        | "none"
        | "request"
        | "pair"
        | "answer-request"
        | "unpair"
        | "cancel-request";
    };

/**
 * Whether `sender` may send `type` to `toId`, and what it changes. Signals
 * only flow along a pending request or an accepted pairing.
 */
export function decideSignal(
  type: SignalType,
  sender: PairingState,
  toId: string,
  target: PairingState | null,
): PairingDecision {
  const reject = { action: "reject" } as const;
  const deliver = (
    effect: Extract<PairingDecision, { action: "deliver" }>["effect"],
  ) => ({ action: "deliver", effect }) as const;

  switch (type) {
    case "request":
      if (toId === sender.id || sender.busy) return reject;
      if (!target || target.busy) return { action: "auto-decline" };
      return deliver("request");
    case "accept":
      return target?.requestedId === sender.id && !sender.busy && !target.busy
        ? deliver("pair")
        : reject;
    case "decline":
      return target?.requestedId === sender.id
        ? deliver("answer-request")
        : reject;
    case "end":
      // The peer may already be gone, so `end` does not need a target row.
      if (sender.peerId === toId) return deliver("unpair");
      if (sender.requestedId === toId) return deliver("cancel-request");
      return reject;
    case "offer":
    case "answer":
    case "ice":
      return sender.peerId === toId && target?.peerId === sender.id
        ? deliver("none")
        : reject;
  }
}
