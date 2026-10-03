# Current Feature

Phase 1 - Make it run

## Status

In Progress

## Goals

Fix the defects that stop Pulse working end to end, so two strangers can see
each other on the map, connect, chat, and start a video call.

Full spec, acceptance criteria, and the defect list: [docs/specs/phase-1.md](specs/phase-1.md)

## Notes

Defects are added to the spec one at a time, after they are checked in the
browser, and each is fixed before the next is added.

- D1 - ending a connection leaves both users busy, so every later request is
  auto-declined. Fixed.
- D2 - accepted connections never leave "connecting", because queued ICE
  candidates were flushed before the remote description was set. Fixed.
- D3 - sent chat messages never reach the other user, because the sender tags
  them `msg` and the receiver only reads `chat`. Fixed.

- D4 - a closed tab strands the other peer on a dead chat and leaves them
  `busy`. Fixed.

- D5 - offline users are never removed from the map, because the poll
  heartbeat refreshed every presence row. Fixed.

Verification also surfaced two findings for Phase 3: unauthenticated polling
exposes every user's coordinates, and `/api/leave` lets any caller remove any
user from the map.

## History

- 2026-10-02 - Added agent context docs and fixed the CLAUDE.md import paths.
- 2026-10-02 - Filled the Database and Architecture Exceptions sections of the
  coding standards, and wrote the Phase 1 spec.
- 2026-10-02 - Verified the Phase 1 defects against the live API. Confirmed D1,
  D3, D4, and found D7 (a closing tab strands the other peer).
- 2026-10-03 - Fixed D1 (busy flag cleared on end), merged to dev.
- 2026-10-03 - Fixed D2 (ICE candidates flushed after the remote description),
  merged to dev.
- 2026-10-03 - Fixed D3 (chat messages sent with the type the receiver reads).
- 2026-10-03 - Fixed D4 (the surviving peer ends the connection when the
  channel closes or fails).
- 2026-10-03 - Fixed D5 (poll heartbeat scoped to the caller).
