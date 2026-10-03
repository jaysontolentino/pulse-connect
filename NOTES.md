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
