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
