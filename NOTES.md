# Notes

## Phase 1

### D1 - Ending a connection leaves both users busy

- Broken: after two users connected and one pressed End, every later request
  between them was auto-declined by the server, and both dots stayed dimmed.
- Found: checked in the browser with two tabs, then reproduced against the API
  with two sessions. Request, accept, `end`, request returned
  `autoDeclined: true` with both rows still `busy = true`.
- Fixed: `app/api/signal/route.ts` now clears `busy` for both peers on `end`,
  the same as on `decline`.

### D2 - Accepted connections never leave "connecting"

- Broken: after a request was accepted, both chat panels stayed on
  "connecting", so neither chat nor video could start.
- Found: reported from the browser, then traced in `lib/webrtc.ts`. Queued ICE
  candidates were flushed before `setRemoteDescription`, so every candidate
  that arrived with the offer or answer was dropped.
- Fixed: `handleSignal` now sets the remote description first, then flushes
  the queued candidates.

### D3 - Sent chat messages never reach the other user

- Broken: after connecting, messages showed for the sender but never appeared
  for the other user.
- Found: traced while fixing D2. `sendChat` tagged messages `t: "msg"`, but
  the data channel handler only reads `t: "chat"`, so they were dropped.
- Fixed: `sendChat` in `lib/webrtc.ts` now sends `t: "chat"`.

### D4 - A closed tab strands the other peer

- Broken: when one user closed the tab mid-chat, the other stayed on a dead
  chat panel and stayed `busy`, so every new request to them was declined.
- Found: reproduced in the browser with three tabs (connect A and B, close B,
  request A from C). The server cannot tell A, because it has no record of who
  is connected to whom.
- Fixed: `PeerSession` now reports a data channel closed by the remote side,
  and the page ends the connection on that or on a failed connection, sending
  `end` so the D1 path clears `busy`.

### D5 - Offline users are never removed from the map

- Broken: users whose leave beacon was lost stayed on the map forever, so the
  online count kept growing.
- Found: in the browser, stopping and restarting the server with two users
  online, then refreshing both tabs, left the two old rows counted as online.
  The heartbeat in `app/api/poll/route.ts` updated `lastSeen` on every row.
- Fixed: the heartbeat is scoped to the caller with `where: { id }`, so rows
  that stop polling go stale and are reaped.

### D6 - Video call controls are pushed off screen

- Broken: during a video call, resizing the window to fullscreen hid the End
  video button and the local preview, so the call could not be ended.
- Found: in the browser, video call between two tabs, then fullscreen. The
  remote video's container is a flex item sized by the video's native
  resolution, so it grew taller than the viewport and the bar was clipped.
- Fixed: `VideoPanel` gives the container `min-h-0` and positions the remote
  video absolutely, so the stream size no longer drives the layout.
