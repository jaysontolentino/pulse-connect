# Current Feature

Phase 3 - Security hardening

## Status

Completed

## Goals

Nobody can act as another user, read their messages, or remove them from the
map, and nobody can flood the coordination API. Pulse stays anonymous, with
no accounts and no new external services.

Full spec, findings, and items: [docs/specs/phase-3.md](specs/phase-3.md)

## Notes

All seven findings were reproduced with `curl` against the local app. They
share one root cause: the client-chosen session id is public (every poll
returns it) and is also the only credential.

- F1 - Polling exposes every user's id to anyone
- F2 - Anyone can read another user's mailbox
- F3 - Anyone can send signals as anyone
- F4 - Anyone can move another user's dot
- F5 - Anyone can remove another user from the map
- F6 - No rate limits
- F7 - No security headers

All seven are closed:

- H1 - server-issued session tokens (F2 to F5)
- H2 - server-side pairing for signals (F3)
- H3 - Zod validation on every route
- H4 - rate limits (F6)
- H5 - an id-free view of who is online for the entry gate (F1)
- H6 - security headers (F7)

Production gets the three Phase 3 migrations automatically on the next
`dev` to `main` merge, which needs `DIRECT_URL` set in Vercel. That deploy
logs everyone off the map once.

Phase 2 is complete: [docs/specs/phase-2.md](specs/phase-2.md). The Phase 4
backlog is in [docs/specs/phase-4.md](specs/phase-4.md).

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
