# Phase 4 - New features

## Status

Completed

## Goal

A video call works every time, and the call, chat, and request flows give the
small signals strangers expect from a live conversation: mute and camera
controls, a typing indicator, and an alert when someone reaches out.

Nothing new reaches the server. Every addition travels over the existing
WebRTC data channel or stays in the browser, so the Phase 3 API and the
database schema do not change.

## Items

Each item is done on its own branch and in its own commit, in the order
below. Each is checked in the browser with two sessions, at desktop width and
at a 390 px mobile width, before it is committed. V1 goes first because V2 is
built on the video call it fixes.

### V1 - Fix unreliable remote video

- Status: done in #30.

- Symptom (from Phase 2 testing): after a video request is accepted, the
  accepting side's remote tracks arrive muted (no frames), and in some calls
  the requesting side never receives a remote stream. Seen in four runs with
  two Chrome sessions and fake cameras.
- Reproduce first, with two real cameras (two devices, or one device per
  browser), and record the cause here before changing code.
- Leads from reading `lib/webrtc.ts` and `app/page.tsx`. None is confirmed:
  - Both sides add tracks at different moments (the acceptor in
    `acceptVideo`, the requester on `video-accept`), so two renegotiations
    overlap. Glare resolution depends on the polite role, which follows the
    connection initiator, not the video requester.
  - `handleSignal` calls are not serialized. `processSignal` fires them with
    `void` for every signal in a poll batch, so two descriptions, or a
    description and its candidates, can be applied concurrently.
  - `onnegotiationneeded` and `handleSignal` have no `catch`, so a failed
    `setLocalDescription` or `setRemoteDescription` is an unhandled rejection
    that nobody sees.
  - `sendSignal` is fire-and-forget, so two signals sent back to back can be
    stored, and drained, in the other order.
  - Check the network tab for `429` responses from `/api/signal` during
    renegotiation (limit: 120 a minute).
- Cause (reproduced on 2026-10-03 with two headless Chrome sessions and fake
  cameras, which failed in every run once the WebRTC calls were logged): the
  first lead. When video is accepted, both sides add tracks and send an
  offer at almost the same moment. The connection initiator ignores the
  other side's offer, the other side rolls its own offer back and answers,
  and that answer carries none of its tracks. No new offer follows, so one
  side never gets a remote stream and the other gets tracks with no frames.
  Ending video renegotiated again just before hang-up as well.
- Fix: the first offer of every chat carries an audio and a video slot on
  both sides. Starting and ending video only swaps tracks in and out of
  those slots with `replaceTrack`, so nothing is renegotiated after setup.
  `VideoPanel` hides "Waiting for stranger's video" on the first decoded
  frame, because the remote stream now exists from the start of the chat.
- Fix the confirmed cause only. Keep the D2 and D6 guarantees.
- Done when, with two real cameras:
  - Ten video calls in a row show both remote videos, with frames, on both
    sides within five seconds of accepting.
  - Ending video and starting it again in the same chat works, in both
    directions.

### V2 - Video call controls

- Status: done in #31.

- Add microphone and camera toggle buttons to the `VideoPanel` control bar,
  beside End video, following Azar: round icon buttons, with a clear
  on/off state and an `aria-pressed` value.
- Toggle by setting `enabled` on the local audio or video track. No track is
  removed, so no renegotiation happens and the call cannot drop.
- Tell the stranger over the data channel with new `PeerControl` values
  (`mic-off`, `mic-on`, `camera-off`, `camera-on`). The remote side shows
  "Stranger's camera is off" over the remote video, and a muted-mic icon on
  the "Stranger" label.
- When the local camera is off, the local preview tile shows a camera-off
  icon instead of a black frame.
- Every video starts with both on. State resets when video ends.
- Done when:
  - Muting the microphone silences it for the stranger, and unmuting
    restores it, without the call dropping.
  - Turning the camera off and on works the same way, and each side shows
    the right indicator.
  - The controls are at least 44 px and stay visible at 390 px wide.

### C1 - Typing indicator

- Status: done in #32.

- Add a `typing` message to the data channel: `{ t: "typing" }`, sent when
  the user types into a non-empty draft, at most once every 3 seconds.
- The receiver shows "Stranger is typing" in `ChatPanel`, below the last
  message, with three softly animated dots (static under
  `prefers-reduced-motion`).
- The indicator hides when a chat message arrives from the stranger, or 5
  seconds after the last `typing` message.
- Nothing about typing is sent through the server.
- Done when:
  - Typing in one session shows the indicator in the other within a second.
  - It disappears when the message arrives, or a few seconds after the
    stranger stops typing without sending.

### A1 - Incoming request alert

- Status: done in #33.

- When a connection request or a video request arrives, play a short, soft
  tone and vibrate (`navigator.vibrate`, where supported).
- Generate the tone with the Web Audio API, so no audio file is added.
  Browsers only allow audio after a user gesture, so create or resume the
  `AudioContext` from the Enter button on the entry gate.
- Keep the alert logic in one hook (`useRequestAlert`), called from the
  `incoming` transitions in `app/page.tsx`.
- Known limit, not in scope: browsers throttle timers in long-hidden tabs, so
  a tab hidden for several minutes may poll too slowly to see a request
  before it times out.
- Done when:
  - A request arriving while the tab is in the background plays the tone.
  - On a phone that supports it, the device vibrates.
  - No tone plays for the user's own actions, or for a request auto-declined
    because the user is busy.

### B1 - Gate dots are tappable right after joining

- Status: done in #34.

- Found while testing A1. For up to one poll after Enter, the map still
  shows the entry gate's dots, whose ids are positions (`lat,lng`) rather
  than session ids. Tapping one sends a request the API rejects with `400`,
  and the user is stuck on "Requesting connection…" until the 30 second
  timeout.
- Fix: dots are tappable only once a poll with the session token has
  replaced the gate dots. The gate dots stay visible until then, so nothing
  blinks.
- Done when tapping a dot repeatedly from the moment Enter is pressed sends
  one valid request, and the stranger sees it.

## Open checks

Automated runs used headless Chrome with fake cameras, which cannot cover
these. Each needs a person and real hardware:

- V1 - ten video calls in a row with two real cameras, plus ending and
  restarting video in the same chat from both sides.
- A1 - a request arriving while the tab is in the background plays the
  tone, and an Android phone vibrates.
