# Current Feature

Phase 4 - New features

## Status

In progress

## Goals

A video call works every time, and the call, chat, and request flows give
strangers mute and camera controls, a typing indicator, and an alert when
someone reaches out. Nothing new reaches the server.

Full spec and items: [docs/specs/phase-4.md](specs/phase-4.md)

## Notes

Items, in order, each on its own branch:

- V1 - Fix unreliable remote video (reproduce with two real cameras first)
- V2 - Video call controls (mute, camera off)
- C1 - Typing indicator
- A1 - Incoming request alert (tone and vibration)

Phase 3 is complete: [docs/specs/phase-3.md](specs/phase-3.md).

## History

- 2026-10-02 - Added agent context docs and fixed the CLAUDE.md import paths.
- 2026-10-02 - Filled the Database and Architecture Exceptions sections of the
  coding standards, and wrote the Phase 1 spec.
- 2026-10-02 - Verified the Phase 1 defects against the live API. Confirmed
  D1 and found the closing-tab defect, later recorded as D4.
- 2026-10-03 - Fixed D1 (busy flag cleared on end), merged to dev.
- 2026-10-03 - Fixed D2 (ICE candidates flushed after the remote description),
  merged to dev.
- 2026-10-03 - Fixed D3 (chat messages sent with the type the receiver reads).
- 2026-10-03 - Fixed D4 (the surviving peer ends the connection when the
  channel closes or fails).
- 2026-10-03 - Fixed D5 (poll heartbeat scoped to the caller).
- 2026-10-03 - Fixed D6 (video panel no longer sized by the remote stream).
- 2026-10-03 - Phase 1 completed. Two strangers can see each other, connect,
  chat, and start a video call.
- 2026-10-03 - Wrote the Phase 2 styling spec.
- 2026-10-03 - Phase 2 completed (S1 to S7). Started the Phase 4 backlog,
  including the unreliable remote video found during S6.
- 2026-10-03 - Verified the Phase 3 findings against the local API and wrote
  the Phase 3 spec.
- 2026-10-03 - Baselined the production database, moved local development to
  a Neon `dev` branch, and made production builds apply migrations.
- 2026-10-03 - Phase 3 completed (H1 to H6). All seven findings closed.
- 2026-10-03 - Wrote the Phase 4 spec (V1, V2, C1, A1).
