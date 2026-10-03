# Phase 3 - Security hardening

## Status

Completed

## Goal

Nobody can act as another user, read their messages, or remove them from the
map, and nobody can flood the coordination API. Pulse stays anonymous, with
no accounts and no new external services.

## Verification setup

The local app with `next start`, two sessions joined through `/api/join`, and
a third "attacker" that only uses what `/api/poll` returns to anyone. Every
finding below was reproduced this way with `curl` on 2026-10-03.

## Root cause

The client generates its own session id, and that id is both public and the
only credential. `/api/poll` returns every online user's id to any caller,
and every route trusts whichever id the request names. So anyone who polls
once can act as every user on the map.

## Findings

### F1 - Polling exposes every user to anyone

- Where: `app/api/poll/route.ts`
- Symptom: a poll with any made-up id returns every online user's id,
  offset coordinates, and busy flag, without joining.
- Reproduced: an unjoined id received both test sessions' ids and positions.
- Note: offset positions are public to every participant by design, and the
  entry gate shows them before joining (S7). The ids are the problem,
  because every other finding uses them.

### F2 - Anyone can read another user's mailbox

- Where: `app/api/poll/route.ts`
- Symptom: polling with another user's id drains their mailbox, so the
  attacker receives that user's requests and WebRTC offers, answers, and ICE
  candidates, and the user never sees them.
- Reproduced: the attacker polled as A and received a request meant for A.
  A's own next poll was empty.

### F3 - Anyone can send signals as anyone

- Where: `app/api/signal/route.ts`
- Symptom: `fromId` is taken from the request body, so an attacker can send
  any signal type between any two users. A spoofed `accept` marks both busy,
  a spoofed `end` or `decline` frees them, and spoofed requests or WebRTC
  messages can be injected into a connection.
- Reproduced: a spoofed `accept` from A to B marked both rows busy.

### F4 - Anyone can move another user's dot

- Where: `app/api/join/route.ts`
- Symptom: `join` upserts by the id in the body, so joining with another
  user's id overwrites their position.
- Reproduced: a join with B's id moved B's dot from London to Sydney.

### F5 - Anyone can remove another user from the map

- Where: `app/api/leave/route.ts`
- Symptom: `leave` deletes whichever id the body names, with its signals.
- Reproduced: a leave with A's id removed A from the map.

### F6 - No rate limits

- Where: `app/api/join/route.ts`, `app/api/signal/route.ts`
- Symptom: any caller can send unlimited signals (up to 64 KB each) to any
  user, and create unlimited presence rows.
- Reproduced: 200 signals in a row were all accepted and all landed in B's
  mailbox.

### F7 - No security headers

- Where: `next.config.ts` (none set)
- Symptom: no Content-Security-Policy, Permissions-Policy, Referrer-Policy,
  frame protection, or `X-Content-Type-Options` on any response.
- Reproduced: `curl -I /` returned none of them.

## Items

Each item is done on its own branch and in its own commit, and checked with
the same `curl` reproductions plus a two-session browser run before it is
committed.

### H1 - Server-issued session tokens (F2, F3, F4, F5)

- Status: done in #20.

- `join` generates the session's public id and a secret token on the server,
  stores only a hash of the token on the presence row, and returns both. The
  client no longer chooses its id.
- `poll`, `signal`, and `leave` identify the caller by the token alone.
  `signal` takes the sender from the token, never from the body. `leave`
  reads the token from the beacon body, because `sendBeacon` cannot set
  headers.
- Schema change through a committed migration.
- Done when:
  - F2 to F5 can no longer be reproduced.
  - Two sessions still connect, chat, and end, and closing a tab still
    removes its dot.

### H2 - Server-side pairing for signals (F3)

- Status: done in #22.

- Record who is connected to whom on accept, and the pending requester on
  request. Accept only `request` to an online user who is not busy, and only
  `accept` and `decline` from the user who was requested. Accept `offer`,
  `answer`, `ice`, and `end` only between paired users.
- Done when:
  - A signal between users who are not paired is rejected.
  - Busy can only be set by a real accept and cleared by its two peers.

### H3 - Validate every request with Zod (F3, F4, F6)

- Status: done in #23.

- Replace the hand-written checks in all four routes with Zod schemas, as the
  coding standards require. Adds `zod` as a dependency.
- Done when:
  - Every route rejects malformed input with a 400 before touching the
    database.

### H4 - Rate limits (F6)

- Status: done in #26.

- Database-backed limits, with no external service: a cap on signals per
  session per minute, on pending requests per session, and on mailbox size
  per recipient.
- Joins cannot be limited per session. Limit them per client address in
  memory per server instance, and record that this is best effort on
  serverless.
- Done when:
  - The 200-signal reproduction is cut off at the limit with a 429.
  - Normal use, including ICE bursts during connection setup, stays under
    every limit.

### H5 - A view-only feed for the entry gate (F1)

- Status: done in #24.

- The gate polls a separate endpoint that returns positions without ids and
  without a mailbox. Ids go only to joined sessions through the token-checked
  poll.
- Done when:
  - No unauthenticated response contains a session id.
  - The gate globe still shows who is online.

### H6 - Security headers (F7)

- Status: done in #25.

- Set headers in `next.config.ts`: a Content-Security-Policy that allows
  Mapbox (including its workers and tiles), `Permissions-Policy` limiting
  camera, microphone, and geolocation to the app itself, `Referrer-Policy:
  no-referrer`, `X-Content-Type-Options: nosniff`, and `frame-ancestors
  'none'`.
- Done when:
  - The headers are present on every response.
  - The map, the gate globe, chat, and video work with no CSP violations in
    the console.

## Accepted risks

- Offset positions are visible to every participant. That is the product,
  and the 1 to 3 km offset is the protection.
- WebRTC exposes each peer's IP address to the other once they connect. A
  relay (TURN) server would hide it, but that is an external service, which
  the requirements rule out.
- Calls find each other through Google's public STUN server
  (`lib/webrtc.ts`), which sees both peers' IP addresses during setup. CSP
  does not cover WebRTC, and avoiding it would mean hosting our own STUN
  server, which the requirements rule out.
- Join limits live in memory per server instance, so on serverless they are
  best effort.
- A user who joins many times gets a new random offset each time. Averaging
  many sessions from one place could narrow it down. Low value, recorded only.

## Out of scope

- The unreliable remote video, which is in the Phase 4 backlog.
- Styling and new features.

## Commit plan

One branch and one commit per item, named `fix/<short-slug>`, with the
finding it closes in the commit body. Log each item in `NOTES.md` under
Phase 3 when it lands.
