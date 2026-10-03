# Phase 2 - Styling

## Status

Planned

## Goal

Pulse looks and feels like one deliberate product: a dark, living globe of
glowing dots, with quiet floating panels for connecting, chatting, and video.
It works as well on a phone as on a desktop.

Behavior does not change. Every flow that works at the end of Phase 1 works
the same way at the end of Phase 2.

## Design direction

The main screen follows **Radio Garden**. The request and call screens follow
**Azar**.

- The map is the product. It stays full-screen, and UI floats over it in a
  small number of compact panels. Nothing permanently covers the map.
- Dark and minimal. A near-black map, one signal-green accent, and muted
  neutrals for everything else.
- The dots carry the "pulse". They glow and breathe softly, so the map reads as
  alive at a glance.
- The request, chat, and video screens use large, thumb-reachable controls,
  with one clear primary action per state.

## References

Main screen (live map of dots):

- Radio Garden (radio.garden) - the closest match. A dark globe of glowing
  green dots, where tapping one connects to something live, under a single
  floating panel. The primary reference for the map, dots, and overlay layout.
- GitHub homepage globe and Shopify's live BFCM globe - pulsing points on a
  dark globe. A reference for how "someone is here right now" is animated.
- Snap Map - people placed as markers near their location. A reference for
  marker scale at different zoom levels.
- Flightradar24 - dense, constantly changing dots with a tap-to-open panel. A
  reference for keeping a busy map legible.

Request and call screens:

- Azar - the primary reference for the incoming request prompt, the
  connecting state, and the full-screen video call with floating controls.
- Chatroulette, Ome.tv, Emerald Chat - references for call controls and
  connection states. Mostly a guide to what to avoid: cluttered chrome and
  competing buttons.

## Current state

What the UI looks like at the end of Phase 1, and why it needs this phase:

- `app/globals.css` sets `font-family: Arial` on `body`, which overrides the
  Geist font loaded in `app/layout.tsx`. It also defines light-mode
  `--background` and `--foreground` tokens that nothing uses.
- Colors are hardcoded Tailwind zinc, emerald, and red classes in every
  component. There is no shared palette.
- `WorldMap` gives every dot a random hue from `dotColor`, set with an inline
  `style.background`. Coding standards forbid inline styles.
- The user's own marker is a 📍 emoji with a "Me" label, which renders
  differently on each platform.
- Notices, the requesting pill, and the video-waiting pill are three copies of
  the same classes in `app/page.tsx`.
- `ChatPanel` is a full-height right sidebar. On a phone it covers the whole
  map, with no sense of where the stranger is.

## Items

Each item is done on its own branch and in its own commit, and is checked in
the browser at desktop width and at a 390 px mobile width before it is
committed.

### S1 - Design tokens and typography

- Define the palette in `@theme` in `app/globals.css`: background, surface,
  raised surface, border, text, muted text, accent (signal green), and danger.
  Dark only. Remove the unused light tokens and the media query.
- Remove the `Arial` override so Geist applies everywhere.
- Done when:
  - Components use the token utilities (for example `bg-surface`,
    `text-muted`, `bg-accent`) instead of raw zinc, emerald, and red classes.
  - No visual regressions beyond the intended palette change.

### S2 - Map and dots

- Use the Mapbox `globe` projection on a dark, low-contrast style, so the
  world view reads as a globe as it does on Radio Garden.
- Fly from the globe down to the user's region when they enter, as Radio
  Garden does (the opening itself is part of S7). Reduced motion jumps there
  instead.
- Every dot uses the accent color with a soft glow and a slow breathing pulse.
  Busy dots are dimmed and do not pulse. This replaces the random hues and the
  inline style with CSS classes.
- Dots and the "you" marker grow as the user zooms in and shrink as they zoom
  out, so the globe view stays uncluttered and street level stays tappable.
- Replace the 📍 emoji with a CSS "you" marker in the same visual language:
  a solid accent dot with a ring and a small "You" label.
- Restyle the online count chip to match the floating panels.
- Done when:
  - Available, busy, and "you" are distinguishable at a glance at world zoom
    and at city zoom.
  - The pulse animation stops when `prefers-reduced-motion` is set.
  - No inline styles remain in `WorldMap`.

### S3 - Floating status pills

- Extract one `StatusPill` component for notices, "Requesting connection",
  and "Waiting for stranger to accept video", so the three share one style.
- Done when:
  - All three render through the shared component, with the Cancel action
    kept on the requesting pill.
  - Pills never overlap the online count chip or the chat panel.

### S4 - Request prompts

- Restyle `ConnectionPrompt` after Azar's incoming request: a centered card
  with a pulsing accent ring, a clear title, and large Accept and Decline
  buttons. Accept is primary, Decline is secondary.
- Done when:
  - Both the connection request and the video request use the new card.
  - Buttons are at least 44 px tall.

### S5 - Chat panel

- Desktop: a floating panel inset from the right edge with rounded corners,
  so the map stays visible around it.
- Mobile: a bottom sheet covering about two thirds of the screen, leaving the
  top of the map visible.
- Distinct bubbles for mine and theirs, a clear "Connecting" state, and a
  header with the Video and End actions.
- Done when:
  - The input stays above the on-screen keyboard on iOS Safari and Android
    Chrome.
  - Long messages wrap, and the list scrolls to the newest message.

### S6 - Video call

- Full-bleed remote video, with the local preview as a rounded tile in a top
  corner, and a floating control bar over the video (End video, primary
  danger), following Azar.
- Keep the D6 layout guarantees: the remote stream's size never drives the
  layout.
- Done when:
  - At any window size, including fullscreen and 390 px wide, the control bar
    and the local preview stay visible.
  - Controls respect the bottom safe-area inset on phones.

### S7 - Entry gate

- Restyle `EntryGate` as a transparent overlay on the live map: a slowly
  spinning globe showing who is online (not tappable), labelled only with
  the countries those people are in, behind the
  Pulse wordmark, the one-line pitch, and a single
  accent "Enter" button. When the location arrives, the gate fades out and
  the same globe flies down to the user, with no cut between gate and map.
- Done when:
  - The location-denied error and the privacy note are styled with the
    palette tokens.
  - The gate looks right at 390 px wide.

## Accessibility

- Text and controls meet WCAG AA contrast against their backgrounds.
- Every interactive element has a visible focus state.
- Touch targets are at least 44 px.
- All animation respects `prefers-reduced-motion`.

## Out of scope

- Behavior changes. If an item seems to need one, stop and raise it first.
- Security hardening (Phase 3) and new features (Phase 4).
- A light theme.
- New dependencies. Mapbox GL and Tailwind already cover everything here.

## Commit plan

One branch and one commit per item, named `feature/<short-slug>`, using
`style:` or `refactor:` conventional commits. Log each item in `NOTES.md` under
Phase 2 when it lands, recording what changed and any decision made along the
way.
