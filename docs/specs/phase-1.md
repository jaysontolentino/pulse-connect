# Phase 1 - Make it run

## Status

In Progress

## Goal

Two strangers can reliably see each other on the map, connect, exchange text
chat, and start a video call.

Defects are added one at a time. Each is checked in the browser first, then
recorded here, then fixed before the next one is added.

## Verification setup

Two browser tabs (or a normal and an incognito window), each with a distinct
mock geolocation set in DevTools, Sensors. Keep the Network tab on
`/api/poll` and `/api/signal` open in both.

## Defects

### D1 - Ending a connection leaves both users busy

- Status: fixed on `fix/end-clears-busy`
- Where: `app/api/signal/route.ts:71-84`
- Symptom: after Tab A connects to Tab B and the connection is ended, every
  later request between them is declined straight away. Tab A sees "Request
  declined." without Tab B ever seeing a prompt, and both dots stay dimmed.
- Cause: `accept` sets `busy = true` on both peers, but the busy transition
  block only resets it on `decline`. `end` (sent by the chat panel's End
  button, by Cancel, and by the request timeout) falls through without
  touching `busy`. The next `request` then hits the `target.busy` check and is
  auto-declined by the server.
- Reproduced against the API with two sessions:
  - request, accept, `end`, request again: the second request returned
    `autoDeclined: true`, and both rows still had `busy = true`.
  - request, `end` (Cancel while still requesting), request again: the second
    request was delivered normally. Neither row is ever marked busy before an
    accept, so Cancel on its own does not trigger this.
- Fix: in the busy transition block, clear `busy` for both peers on `end` as
  well as `decline`.
- Done when:
  - Connect A to B, End from either side, then request again: B sees the
    prompt and can accept.
  - Both dots return to full opacity after the End.
  - Cancel while requesting, then request again, still works.
  - `npm run build` and `npm run lint` pass clean.

## Out of scope

Styling, security hardening, and new features. Those are Phases 2, 3, and 4.
Fix the defect, do not refactor around it.

## Commit plan

One branch and one commit per defect, named `fix/<short-slug>`, with the symptom
in the commit body. Log each fix in `NOTES.md` under Phase 1 at the time it is
fixed, recording what was broken, how it was found, and how it was fixed.
