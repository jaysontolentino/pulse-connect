# Notes

## Phase 1 - Making it work

Each bug was reproduced in the browser with two or three tabs, then traced in
the code or confirmed against the API.

| Bug | How it was found | Fix |
| --- | --- | --- |
| D1 - After ending a chat, both users stayed "busy" and could not connect again | Request, accept, end, request: the server auto-declined | Clear `busy` for both users on `end` |
| D2 - Chats stuck on "connecting" | Traced in `lib/webrtc.ts`: network candidates were applied before the connection was ready, so all were dropped | Apply them after the remote description is set |
| D3 - Messages never reached the other user | The sender tagged messages `msg`, the receiver only read `chat` | Send `chat` |
| D4 - Closing a tab left the other user on a dead chat, still busy | Connect two tabs, close one, try to reach the other from a third | End the chat when the connection closes or fails |
| D5 - Users who left stayed on the map forever | Restarted the server with users online: old dots never went away | The heartbeat only updates the caller, so stale users are removed |
| D6 - In fullscreen, the End video button went off screen | The video's size pushed the layout taller than the window | Position the video absolutely, so its size cannot move the controls |

## Phase 2 - Styling

The goal was to look like one deliberate product without changing behavior.
The map is the product, so it stays full-screen with a few small panels
floating over it, after Radio Garden: a dark globe, one green accent, and
dots that glow and breathe so the map feels alive. The request and call
screens follow Azar: big buttons and one clear action at a time.

- S1 - Colors and fonts: one shared palette instead of hardcoded colors. The
  red was darkened so white text on it is readable.
- S2 - Map and dots: a 3D globe, glowing green dots, grey dots for busy
  users, and a "You" marker instead of an emoji. Dots grow as you zoom in.
- S3 - Status messages: one shared pill style, stacked so two messages never
  cover each other.
- S4 - Request prompts: a centered card with Accept and Decline, and a
  different icon for chat and video requests.
- S5 - Chat: a floating panel on desktop and a bottom sheet on phones, so the
  map stays visible. The input stays above the phone keyboard.
- S6 - Video: full-screen video, your camera in a corner tile, controls
  floating at the bottom.
- S7 - Entry screen: a spinning globe of who is online, which flies down to
  you when you enter.

Every item was checked on desktop and at phone width (390 px), with readable
contrast, touch targets of at least 44 px, and no animation for users who
turn motion off.

## Phase 3 - Security

### Issues found

All seven came from one problem: a user's id was public (anyone could list
every id), and that id was also the only thing proving who you were.

### Ranked by harm

1. F2 - Anyone could read another user's messages from the server, including
   their IP address. This breaks the promise of anonymity.
2. F3 - Anyone could send messages pretending to be someone else, and break
   into or end their chats.
3. F1 - Anyone could list every user's id. Harmless alone, but it made every
   other attack work against everyone at once.
4. F5 - Anyone could remove any user from the map.
5. F6 - No limits, so anyone could flood the server.
6. F4 - Anyone could move another user's dot. It cannot reveal a real
   location, since only offset positions are stored.
7. F7 - No browser security headers. Extra protection, nothing exploitable
   today.

### What was fixed

All seven:

- H1 - The server issues each user a secret token, and every request must
  carry it. This alone closed F2 to F5, so it went first.
- H2 - The server only passes messages between two users who actually
  connected (F3).
- H3 - Every request is checked for a valid shape before it is used.
- H4 - Rate limits on messages, requests, and joins (F6).
- H5 - The entry screen gets a list of dots with no ids (F1).
- H6 - Security headers on every response (F7).

Left as is: users can see each other's approximate position (that is the
app), and video calls reveal each user's IP address to the other. Hiding it
needs an outside relay service, which the requirements rule out.

## Phase 4 - New features

Nothing new goes through the server. Everything travels directly between the
two browsers or stays on the device.

### What was built, and why

- V1 - Fixed video. Video often failed to show up, and the next feature
  built on it. Both browsers were renegotiating the call at the same moment
  and one side's camera got lost. Now the call is set up once, and starting
  or stopping video just swaps the camera in or out.
- V2 - Mute and camera off. You can go quiet or hide your camera without
  hanging up, and the stranger sees that you did.
- C1 - "Stranger is typing". In an anonymous chat, silence looks like the
  other person left.
- A1 - Request alert. A soft tone and a vibration when someone wants to
  connect or start video, so a request is not missed while you are in
  another tab.
- B1 - Fixed a bug found while testing: tapping a dot right after entering
  sent a broken request and left you waiting 30 seconds.

Still to check by hand: video with two real cameras, and the alert in a
background tab and on an Android phone.

### Next, with more time

- Next stranger: one button that ends the chat and connects you to another
  available person nearby, so you do not have to hunt for dots.
- Block: hide a stranger for the rest of your session, so they cannot
  request you again. An anonymous app needs some answer to bad behavior.
- Language and interests: optional tags on your dot for this session only,
  so you can find someone you can actually talk to.
- Share a photo: send an image straight to the stranger over the chat
  connection, never through the server.
- Desktop notifications: with permission, show a system notification for a
  request when the Pulse tab is not open in front of you.
