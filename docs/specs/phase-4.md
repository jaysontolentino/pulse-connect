# Phase 4 - New features

## Status

Backlog

## Goal

Features that go beyond making Pulse run, look right, and stay safe. Each
item is specced in full here before it is built.

## Backlog

Deferred from Phase 2, where they came up as design recommendations but add
behavior rather than styling:

- Incoming request alert - vibrate (where supported) and play a soft sound
  when a connection or video request arrives, so it is not missed while the
  user is in another tab.
- Video call controls - mute the microphone and turn the camera off and on
  during a call, without ending it.
- Typing indicator - show "Stranger is typing" in the chat panel while the
  other user is composing a message.

Carried from Phase 2 testing:

- Fix unreliable remote video - after a video request is accepted, the
  accepting side's remote tracks arrive muted (no frames), and in some calls
  the requesting side never receives a remote stream. Seen in four runs with
  two Chrome sessions and fake cameras, on the Phase 2 S6 branch and on `dev`
  before it. Reproduce with two real cameras before recording a cause.
