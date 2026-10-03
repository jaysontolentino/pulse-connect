# Phase 1 - Make it run

## Status

Completed

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

### D4 - A closed tab strands the other peer

- Status: fixed on `fix/peer-drop-ends-connection`
- Where: `lib/webrtc.ts` (`wireDataChannel`), `app/page.tsx` (`startPeer`)
- Symptom: A and B are connected and B closes the tab. A's chat panel stays
  open on a dead connection. A stays `busy`, so a new tab C that requests A
  is declined at once, A never sees a prompt, and A's dot stays dimmed.
- Cause: the server has no record of who is connected to whom, so B's
  `/api/leave` only removes B's own row and signals. Nothing sends A an `end`.
  A's client only reacts to `connectionState === "failed"`, which can take
  about 30 seconds or never come, and even then it tears down locally without
  sending `end`, so A's `busy` flag is never cleared.
- Reproduced in the browser with three tabs: connect A and B, close B, watch
  A for 30 seconds, then request A from C.
- Fix: the surviving peer ends the connection itself. `PeerSession` reports
  when the data channel closes, unless the session closed it, and the page
  treats that the same as a failed connection. Both paths now send `end` before
  tearing down, which clears `busy` through the D1 path. This also covers
  crashes and network loss, where no leave beacon is sent.
- Done when:
  - Closing B while connected returns A to the map within a few seconds with
    "Stranger disconnected."
  - C can then request A, A sees the prompt, and A's dot is at full opacity.
  - Pressing End still ends cleanly for both sides, and D1 to D3 still pass.
  - `npm run build` and `npm run lint` pass clean.

### D5 - Offline users are never removed from the map

- Status: fixed on `fix/heartbeat-scope`
- Where: `app/api/poll/route.ts:25-28`
- Symptom: a user whose leave beacon is lost (server down, crash, network
  drop) stays on the map forever. Stopping the server with two users online,
  restarting it, and refreshing both tabs showed 3 other users instead of 1.
- Cause: the heartbeat runs `updateMany({ where: {} })`, so every poll
  refreshes `lastSeen` on every presence row, not just the caller's. While
  anyone is polling, no row ever goes stale and the reaper never removes it.
  This is the unscoped write the coding standards warn about.
- Reproduced in the browser: two tabs online, stop the server, start it
  again, refresh both tabs. The two old rows stayed and were counted online.
- Fix: scope the heartbeat to the caller with `where: { id }`.
- Done when:
  - Repeating the restart steps shows each tab 1 other user once the old rows
    pass `STALE_MS` (15 seconds).
  - A tab that stays open and polling keeps its dot on the map.
  - D1 to D4 still pass.
  - `npm run build` and `npm run lint` pass clean.

### D6 - Video call controls are pushed off screen

- Status: fixed on `fix/video-panel-layout`
- Where: `app/components/VideoPanel.tsx:31-37`
- Symptom: during a video call, resizing the window (for example to
  fullscreen) hides the End video button and the local picture-in-picture, so
  the call cannot be ended from the video view.
- Cause: the remote video sits in a `flex-1` container, and a flex item's
  minimum height defaults to its content height. The `<video>` element's
  content height is the stream's native resolution, so the container grows
  taller than the viewport, pushing the End video bar below it and taking the
  bottom-anchored local preview with it. `main` is `overflow-hidden`, so both
  are clipped out of view.
- Reproduced in the browser: start a video call between two tabs, then make
  one window fullscreen.
- Fix: give the container `min-h-0` and position the remote video absolutely
  inside it, so the stream's size no longer drives the layout.
- Done when:
  - At any window size, including fullscreen and a narrow mobile width, the
    remote video fills the space above the End video bar, and the bar and the
    local preview stay visible.
  - End video still returns both users to text chat.
  - `npm run build` and `npm run lint` pass clean.

## Out of scope

Styling, security hardening, and new features. Those are Phases 2, 3, and 4.
Fix the defect, do not refactor around it.

## Commit plan

One branch and one commit per defect, named `fix/<short-slug>`, with the symptom
in the commit body. Log each fix in `NOTES.md` under Phase 1 at the time it is
fixed, recording what was broken, how it was found, and how it was fixed.
