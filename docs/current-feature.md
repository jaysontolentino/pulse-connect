# Current Feature

Phase 2 - Styling

## Status

Completed

## Goals

Make Pulse look and feel like one deliberate product: a dark, living globe of
glowing dots with quiet floating panels, following Radio Garden for the map
and Azar for the request and call screens. Works on phone and desktop. No
behavior changes.

Full spec, design direction, references, and items: [docs/specs/phase-2.md](specs/phase-2.md)

## Notes

Items land one at a time, each on its own branch and checked in the browser
at desktop and 390 px mobile width.

- S1 - Design tokens and typography
- S2 - Map and dots
- S3 - Floating status pills
- S4 - Request prompts
- S5 - Chat panel
- S6 - Video call
- S7 - Entry gate

Phase 1 is complete: [docs/specs/phase-1.md](specs/phase-1.md). Its two
security findings are carried to Phase 3. Features deferred from this phase,
and the unreliable remote video found while testing S6, are kept in the
Phase 4 backlog: [docs/specs/phase-4.md](specs/phase-4.md).

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
