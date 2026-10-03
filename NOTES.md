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

### S4 - Request prompts

- Changed: `ConnectionPrompt` is a centered card after Azar's incoming
  request: a pulsing accent ring around a person or camera glyph, the title,
  a subtitle, and 48 px Decline and Accept buttons with Accept as the primary.
  The backdrop blurs the map behind it.
- Decision: the prompt takes an `icon` prop so the connection and video
  requests read differently at a glance. The connection request gained the
  subtitle "Accept to start an anonymous chat." so both cards share one shape.
- Decision: the card is an `alertdialog` labelled by its title, so screen
  readers announce the request when it appears.
- Checked: in the browser with a fake camera, the connection prompt at 390 px
  and the video prompt at 1280 px over an open chat. Accepting each still
  opened the chat and then the video panel on both sides.

### S5 - Chat panel

- Changed: on desktop the chat is a floating rounded panel inset from the
  right edge. Below the `sm` breakpoint it is a bottom sheet at 66 dvh with a
  grabber, leaving the top of the map visible. The header has a live status
  dot, a Video button with a camera glyph, and End. Bubbles have a tail
  corner, wrap long or unbroken text, and keep line breaks. Before the
  connection opens, the empty state reads "Opening a private line to the
  stranger" instead of "Say hello".
- Decision: the root layout sets `viewportFit: "cover"` so the safe-area
  insets apply, and `interactiveWidget: "resizes-content"` so Android Chrome
  shrinks the layout for the keyboard and the sheet's input stays above it.
  iOS Safari ignores that setting and pans the focused input into view.
- Decision: the input uses 16 px text on phones, because iOS Safari zooms
  the page when focusing an input with smaller text.
- Decision: the panel is opaque. A translucent, blurred panel let the glow of
  the dots behind it bleed through as a smudge. The desktop panel stops 40 px
  above the bottom so it does not cover the Mapbox attribution.
- Checked: in the browser at 1280 px and 390 px: the connecting state, a
  two-way conversation with a long sentence and a long unbroken URL, no
  horizontal overflow, and the newest message in view after 16 messages. The
  on-screen keyboard could not be exercised headless.

### S6 - Video call

- Changed: full-bleed remote video under a top-left "Stranger" chip, the
  local preview as a rounded 3:4 tile in the top-right corner, and a floating
  56 px End video button over a bottom gradient, padded by the bottom
  safe-area inset. The waiting state has the same pulsing accent dot as the
  status pills.
- Decision: every layer is absolutely positioned inside the panel, so the D6
  guarantee no longer depends on flex sizing. The remote stream's native size
  cannot move the controls.
- Decision: the local preview is mirrored, as camera apps and Azar do, so
  moving left moves the preview left. The stream sent to the stranger is not
  affected.
- Checked: in the browser with fake cameras at 1920 x 1080, 2560 x 1440,
  390 x 844, and 844 x 390. The End video button and the preview stayed fully
  in view at every size, and End video returned both users to the chat.
- Found: remote media is unreliable. Across four runs on this branch and on
  `dev` before it, the accepting side's remote tracks always arrived muted
  (no frames), and in half the runs the requesting side never received a
  remote stream. This is in the WebRTC video path, not the panel, and is out
  of scope for Phase 2.

### S7 - Entry gate

- Changed: the gate is a transparent overlay on the live map. A slowly
  spinning globe shows who is online (not tappable), labelled only with their
  countries. On Enter the gate fades and the globe flies to the user. This
  replaces S2's opening.
- Decision: the gate polls every 5 s instead of 1.5 s, since every visitor
  polls there. Country names are HTML markers placed from Mapbox's
  `country-boundaries-v1` tileset, with overlapping labels hidden.
- Gotcha: the style's own country labels show nothing on a phone, because
  the tiles at that zoom carry no country names.
- Note for Phase 3: the gate reads every online user's offset coordinates
  before joining, so any `/api/poll` fix must keep a view-only path.
- Checked: at 1280 px and 390 px: spin, labels, fly-in, reduced motion,
  denied location, and two sessions connecting.

## Phase 3

### H1 - Server-issued session tokens

- Changed: `join` creates the public id and a random 32-byte token on the
  server, stores only the token's SHA-256 hash, and returns the token.
  `poll` and `signal` identify the caller by `Authorization: Bearer`, and
  `leave` by the token in its beacon body. `signal` takes the sender from the
  token only. A poll with no token (the entry gate) returns peers and nothing
  else. The page keeps the token instead of a client-made id, and the gate
  shows an error if joining fails.
- Decision: the migration clears `Presence` and `Signal` before adding the
  required `tokenHash` column. Both hold only transient rows, and existing
  rows have no token.
- Gotcha: the database had been created with `db push`, so the initial
  migration was never recorded. A diff against the pre-H1 schema was empty,
  so it was baselined with `migrate resolve --applied`, with no changes.
- Gotcha: `migrate dev` over the Neon pooler left Prisma's advisory lock held
  on a pooled connection, and every later migration timed out. Cleared from
  the Neon console. Run migrations over the direct (non-pooler) host.
- Decision: local development now uses a Neon `dev` branch. The original
  database is production, and the H1 migration is applied there only at
  deploy time.
- Checked: against the `dev` branch, F2 to F5 no longer reproduce (anonymous
  and forged-token polls get no mail, a body `fromId` is ignored, a join with
  another id makes a new row, a leave without the token is a 401). In the
  browser: the gate shows dots, two sessions connect, chat, and end, and a
  closed tab leaves the map in about 3 s.

### H2 - Server-side pairing for signals

- Changed: presence rows record `requestedId` (a pending outgoing request)
  and `peerId` (the accepted pairing). `lib/pairing.ts` decides each signal:
  `request` to an online, idle user (busy or offline still auto-declines),
  `accept` and `decline` only from the requested user, `end` to the peer or
  to one's own pending request, and `offer`, `answer`, `ice` only between
  paired users. Anything else is a 409 and is not delivered.
- Decision: `end` needs no target row, so a user whose peer already left can
  still unpair and clear their own busy flag (the D4 path).
- Decision: the other side's row is only changed while it still points at
  the sender, so a late signal cannot undo a newer pairing.
- Note: when one user ends a chat, the other's client also sends `end` as its
  channel closes. That second `end` is now a harmless 409.
- Checked: against the Neon `dev` branch, a stranger's `accept`, `end`,
  `offer`, `ice`, and `decline` are all rejected, busy is only set by a real
  accept, and end, cancel, and a peer leaving all free both users. In the
  browser: decline, cancel, connect, chat, video, end, and reconnect all
  work, and a closed tab frees the other user (about 15 s, the same as
  before H2).

### H3 - Validate every request with Zod

- Changed: `lib/schemas.ts` holds a Zod schema for each input (join
  coordinates, the leave token, the signal body with a UUID `toId`, one of
  the seven signal types, and a payload of at most 64 KB), and `parseBody`
  reads and validates a body. The hand-written checks (`isValidLatLng`,
  `VALID_TYPES`, `MAX_PAYLOAD`) are gone. Adds `zod`.
- Decision: `sessionForToken` checks the token's format first, so a malformed
  token never reaches the database, and the signal route validates its body
  before looking up the sender.
- Decision: `parseBody` reads the body as text, because `sendBeacon` does not
  send a JSON content type.
- Checked: with the database address deliberately broken, every malformed
  join, leave, signal, and poll returned 400 or 401 while valid ones reached
  the database (500), so validation runs first. Against the Neon `dev`
  branch, the full two-session browser flow still works.

### H5 - A view-only feed for the entry gate

- Changed: `GET /api/dots` returns online positions and busy flags with no
  session ids, read-only and filtered by staleness. `/api/poll` now requires
  a token. The gate reads `/api/dots`, and switches to the token poll once
  the user joins.
- Decision: the map keys markers by id, so gate dots are keyed by their
  position (`lat,lng`) in `gateDots`. Positions are stable between polls, so
  markers stay put.
- Checked: no unauthenticated response (`/api/dots`, `/api/join`, a poll
  without a token) contains a session id, and only token polls return ids.
  In the browser, the gate calls only `/api/dots`, its dots and country
  labels still show, and the full two-session flow still works.
