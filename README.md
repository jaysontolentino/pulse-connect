# Pulse

A living globe of anonymous strangers. Every online user is a dot on a world
map. Tap one, start talking.

Pulse is a real-time anonymous connection app. There are no accounts, no
profiles, and no history. You open the page, share your location, and appear
as a glowing dot near (but never exactly at) where you are. Tap someone else's
dot to send a request, and once they accept you can chat or start a video
call. Close the tab and every trace of you is gone.

## Features

- **Live world map** - a full-screen 3D globe where every online user is a
  dot. Dots appear when people join and disappear when they leave. Busy users
  show as grey.
- **Location privacy** - each dot is placed 1 to 3 km away from your real
  position, with a fresh random offset every session. Raw coordinates never
  leave the browser.
- **Connection requests** - tap a dot to send a request. The other person can
  accept or decline, and you are told if they decline or do not answer in
  30 seconds. You can only be in one connection at a time.
- **Text chat** - real-time, peer-to-peer messages with a "stranger is typing"
  indicator. Messages are never sent to or stored by the server.
- **Video calls** - either side can start a video call from the chat. The
  other person must accept. Mute your microphone or turn off your camera
  without hanging up, and end the call to return to text chat.
- **Request alerts** - a soft tone and a vibration when someone wants to
  connect or start video, so you do not miss it in another tab.
- **Entry screen** - a spinning globe of who is online right now, which flies
  down to your location when you enter.
- **Responsive** - a floating chat panel on desktop and a bottom sheet on
  phones, with large touch targets and reduced motion when the OS asks for it.

## Privacy by design

- No sign-up, no login, no personal data.
- Chat and video travel directly between the two browsers over WebRTC. The
  server never sees them.
- The database holds coordination state only: who is online (with offset
  coordinates) and short-lived signaling messages. Rows are deleted when you
  leave, when you go stale (15 seconds without a heartbeat), or once a message
  is delivered.
- Each session gets a secret token from the server, and every API call must
  carry it. The server only relays signals between two users who actually
  connected.
- Rate limits on joins, requests, and signals, input validation with Zod on
  every route, and security headers (including a Content Security Policy) on
  every response.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Route Handlers) |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Map | [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) |
| Real-time media | WebRTC (data channel for chat, media tracks for video), STUN only |
| Database | PostgreSQL ([Neon](https://neon.tech) recommended) |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Validation | Zod |
| Hosting | Vercel |

## How it works

```text
 Browser A                    Next.js API + Postgres                 Browser B
 ---------                    ----------------------                 ---------
 join  --------------------->  Presence row (offset lat/lng)
 poll every 1.5 s  <-------->  dots + signals mailbox  <-------->  poll every 1.5 s
 request / offer / ice ----->  Signal rows (drained on read) -----> accept / answer / ice

 <==================== WebRTC peer-to-peer: chat and video ====================>
```

- **Coordination** (presence and the WebRTC handshake) runs through the server
  using short HTTP polling. WebSockets are not available on Vercel serverless
  functions, so polling keeps the app deployable with no extra services.
- **Chat and video** run peer-to-peer once the handshake completes.
- **Leaving** sends a `navigator.sendBeacon` on tab close, and stale sessions
  are cleaned up automatically if the beacon never arrives.

### API routes

| Route | Purpose |
| --- | --- |
| `POST /api/join` | Start a session, store the offset position, return the session id and token |
| `GET /api/poll` | Heartbeat, return the visible dots and drain your pending signals |
| `POST /api/signal` | Send a request, accept, decline, SDP offer or answer, ICE candidate, or end |
| `POST /api/leave` | End the session and delete your rows |
| `GET /api/dots` | Anonymous dot positions (no ids) for the entry screen globe |

## Getting started

### Prerequisites

- Node.js 20.12 or later
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)
- A free [Mapbox access token](https://account.mapbox.com/access-tokens/)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `DATABASE_URL` | Pooled Postgres connection used by the app |
   | `DIRECT_URL` | Direct (non-pooler) connection used for migrations. Optional locally, required for production builds |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox public token |

3. Apply the database migrations:

   ```bash
   npx prisma migrate deploy
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

### Testing with two users

Pulse connects two strangers, so you need two participants:

1. Open the app in two separate browser windows (for example a normal window
   and an incognito window, or two different browsers).
2. In each window, open DevTools, then **Sensors**, and set a different mock
   geolocation so the two dots land apart.
3. Tap one dot, accept the request in the other window, then chat and start a
   video call.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client, run production migrations (on Vercel production only), and build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Deployment

Pulse deploys to Vercel as a single Next.js project with no other services.

1. Import the repository into Vercel.
2. Set `DATABASE_URL`, `DIRECT_URL`, and `NEXT_PUBLIC_MAPBOX_TOKEN` in the
   project's environment variables. Use a pooled connection string for
   `DATABASE_URL`.
3. Deploy. Production builds run `prisma migrate deploy` automatically. Point
   Preview deployments at a separate development database, never production.

## Project structure

```text
app/
  api/            Route Handlers: join, poll, signal, leave, dots
  components/     WorldMap, EntryGate, ChatPanel, VideoPanel, ConnectionPrompt, StatusPill
  page.tsx        The single client surface and its state machine
lib/              WebRTC, presence, sessions, rate limiting, schemas, geo offset
prisma/           Schema and migrations
docs/             Requirements, coding standards, and phase specs
```

## Known limitations

- Connections use STUN only, with no TURN relay. A small share of strict or
  corporate networks will not establish a peer-to-peer connection.
- A video call reveals each user's IP address to the other peer, which is
  inherent to WebRTC without a relay server.

## Documentation

- [Requirements](docs/requirements.md)
- [Coding standards](docs/coding-standards.md)
- Phase specs: [1](docs/specs/phase-1.md), [2](docs/specs/phase-2.md),
  [3](docs/specs/phase-3.md), [4](docs/specs/phase-4.md)
