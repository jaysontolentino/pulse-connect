# Phase 1 - Make it run

## Status

In Progress

## Goal

Two strangers can reliably see each other on the map, connect, exchange text
chat, and start a video call.

Defects are added one at a time. Each is checked in the browser first, then
recorded here, then fixed before the next one is added.

## Verification setup

Two browser tabs (or a normal and an incognito window), each with a distinct
mock geolocation set in DevTools, Sensors. Keep the Network tab on
`/api/poll` and `/api/signal` open in both.

## Defects

### D1 - Ending a connection leaves both users busy

- Status: fixed on `fix/end-clears-busy`
- Where: `app/api/signal/route.ts:71-84`
- Symptom: after Tab A connects to Tab B and the connection is ended, every
  later request between them is declined straight away. Tab A sees "Request
  declined." without Tab B ever seeing a prompt, and both dots stay dimmed.
- Cause: `accept` sets `busy = true` on both peers, but the busy transition
  block only resets it on `decline`. `end` (sent by the chat panel's End
  button, by Cancel, and by the request timeout) falls through without
  touching `busy`. The next `request` then hits the `target.busy` check and is
  auto-declined by the server.
- Reproduced against the API with two sessions:
  - request, accept, `end`, request again: the second request returned
    `autoDeclined: true`, and both rows still had `busy = true`.
  - request, `end` (Cancel while still requesting), request again: the second
    request was delivered normally. Neither row is ever marked busy before an
    accept, so Cancel on its own does not trigger this.
- Fix: in the busy transition block, clear `busy` for both peers on `end` as
  well as `decline`.
- Done when:
  - Connect A to B, End from either side, then request again: B sees the
    prompt and can accept.
  - Both dots return to full opacity after the End.
  - Cancel while requesting, then request again, still works.
  - `npm run build` and `npm run lint` pass clean.

### D2 - Accepted connections never leave "connecting"

- Status: fixed on `fix/ice-candidate-flush`
- Where: `lib/webrtc.ts:110-111`
- Symptom: B accepts A's request, both chat panels open, but they stay in the
  connecting state. No message can be sent and video cannot be started.
- Cause: ICE candidates usually arrive in the same poll batch as the offer or
  answer, before the remote description is applied, so they are queued.
  `handleSignal` flushes that queue before calling `setRemoteDescription`, so
  each `addIceCandidate` either throws (error swallowed) or the queue is empty
  at flush time and is never flushed again. Neither peer receives the other's
  candidates, ICE never pairs, and the data channel never opens.
- Fix: apply the remote description first, then flush the queued candidates.
- Done when:
  - A requests, B accepts, and both panels move to connected within a few
    seconds.
  - The connection holds after End and a fresh request (D1 still passes).
  - `npm run build` and `npm run lint` pass clean.

### D3 - Sent chat messages never reach the other user

- Status: fixed on `fix/chat-message-type`
- Where: `lib/webrtc.ts:132`
- Symptom: once connected, the sender sees their own message, but it never
  appears in the other user's panel. No error is shown on either side.
- Cause: `sendChat` sends `{ t: "msg", text }`, while the data channel
  handler only accepts `t === "chat"`. Every chat message falls through both
  branches and is silently dropped.
- Fix: send chat messages with `t: "chat"`, the type the receiver expects.
- Done when:
  - A and B exchange messages and each sees the other's text in real time.
  - Video request and accept still work (control messages are unaffected).
  - `npm run build` and `npm run lint` pass clean.

## Out of scope

Styling, security hardening, and new features. Those are Phases 2, 3, and 4.
Fix the defect, do not refactor around it.

## Commit plan

One branch and one commit per defect, named `fix/<short-slug>`, with the symptom
in the commit body. Log each fix in `NOTES.md` under Phase 1 at the time it is
fixed, recording what was broken, how it was found, and how it was fixed.
