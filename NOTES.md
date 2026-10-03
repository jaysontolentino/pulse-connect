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

## Phase 2

### S1 - Design tokens and typography

- Changed: the palette lives in `@theme` in `app/globals.css` (background,
  surface, raised, line, line-strong, foreground, muted, subtle, accent,
  on-accent, danger, danger-soft). Every raw zinc, emerald, and red class in
  `app/page.tsx` and `app/components/` now uses a token utility. The unused
  light-mode variables are gone, and so is the `Arial` override, so Geist
  applies everywhere.
- Decision: danger is red-600 rather than red-500, so white button text meets
  AA contrast. `danger-soft` is a lighter red for error text on the dark
  background, where red-600 is too dim.
- Checked: in the browser at 1280 px and 390 px, the entry gate, map,
  requesting pill, and chat panel on both sides of a live connection.

### S2 - Map and dots

- Changed: the map uses the Mapbox `globe` projection with fog and stars
  colored from the palette tokens. Every dot is an accent-colored core with a
  breathing glow, and busy dots are grey, dimmed, and still. The 📍 emoji is
  replaced by a CSS "You" marker, and the online count is a pill at the top
  left, clear of the Mapbox logo.
- Gotcha: Mapbox positions a marker with an inline `transform` and fades
  occluded globe markers with an inline `opacity`. The old hover `scale` and
  busy `opacity` on the marker element either never applied or fought with
  that, so the visuals now live on an inner `.pulse-dot-core`.
- Decision: the "You" marker ignores pointer events, because its label can
  sit on top of a nearby stranger's dot and swallow the click.
- Decision: the map opens at zoom 2.5 on the user and eases to zoom 4 over
  2 s with an ease-out curve, as Radio Garden does. An earlier version opened
  on the whole globe first, which felt slow. `easeTo` is not marked
  `essential`, so Mapbox jumps instead under reduced motion, and any drag or
  scroll cancels the glide.
- Decision: dot size follows the zoom in four bands (far below 3, mid below
  6, near below 10, close beyond), set as `data-zoom` on the map wrapper and
  read by CSS variables. Bands rather than a continuous scale mean React only
  re-renders when a boundary is crossed, and no inline styles are needed.
  Dots are 6, 10, 14, and 18 px, the "You" marker 4 px larger, and the size
  eases between bands. The 28 px hit area stays fixed at every zoom.
- Checked: in the browser with three and four sessions, at world zoom (globe)
  and city zoom, at 1280 px and 390 px, with a busy pair visible to a third
  user, and with `prefers-reduced-motion` (no animation).

### S3 - Floating status pills

- Changed: notices, "Requesting connection", and "Waiting for stranger to
  accept video" render through one `StatusPill` component, with a pulsing
  accent dot on the two pending states and the Cancel action on the request.
- Decision: pills stack in a column instead of sharing one slot. Before,
  a notice and the requesting pill could render on top of each other, and
  giving either priority would hide the other (or the Cancel button) for up
  to 3.5 s.
- Decision: while a chat is open, the pills render inside `ChatPanel`, over
  the top of the message list, instead of floating over the map. Notices
  such as "Video declined." arrive mid-chat, and on a phone the panel covers
  the whole map, so any map position would overlap it.
- Decision: the Cancel chip is 36 px tall, with a pseudo-element padding its
  hit area to 44 px so the pill stays compact.
- Checked: in the browser with a fake camera: request and Cancel at 1280 px,
  then connect, request video, decline from a 390 px session, and end. The
  waiting and "Video declined." pills showed inside the chat panel, and the
  notice moved to the map after End.
