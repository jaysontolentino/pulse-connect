// Shared types across client + API.

// Signal mailbox message types.
export type SignalType =
  | "request" // connection request (tap a dot)
  | "accept" // recipient accepted
  | "decline" // recipient declined (or auto-declined while busy)
  | "offer" // WebRTC SDP offer
  | "answer" // WebRTC SDP answer
  | "ice" // WebRTC ICE candidate
  | "end"; // hang up / leave the connection

export interface PeerDot {
  id: string;
  lat: number;
  lng: number;
  busy: boolean;
}

export interface SignalMsg {
  id: string;
  fromId: string;
  toId: string;
  type: SignalType;
  payload: string | null;
  createdAt: string;
}

/** A dot on the entry gate's globe: a position with no session id. */
export interface GateDot {
  lat: number;
  lng: number;
  busy: boolean;
}

export interface DotsResponse {
  dots: GateDot[];
}

export interface JoinResponse {
  token: string;
}

export interface PollResponse {
  peers: PeerDot[];
  signals: SignalMsg[];
}
