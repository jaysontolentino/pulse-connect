# Current Feature

Phase 1 - Make it run

## Status

Not Started

## Goals

Fix the defects that stop Pulse working end to end, so two strangers can see
each other on the map, connect, chat, and start a video call.

Full spec, acceptance criteria, and the defect list: [docs/specs/phase-1.md](specs/phase-1.md)

## Notes

Defects are added to the spec one at a time, after they are checked in the
browser, and each is fixed before the next is added.

- D1 - ending a connection leaves both users busy, so every later request is
  auto-declined.

Verification also surfaced two findings for Phase 3: unauthenticated polling
exposes every user's coordinates, and `/api/leave` lets any caller remove any
user from the map.

## History

- 2026-10-02 - Added agent context docs and fixed the CLAUDE.md import paths.
- 2026-10-02 - Filled the Database and Architecture Exceptions sections of the
  coding standards, and wrote the Phase 1 spec.
- 2026-10-02 - Verified the Phase 1 defects against the live API. Confirmed D1,
  D3, D4, and found D7 (a closing tab strands the other peer).
