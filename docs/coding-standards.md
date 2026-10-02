# Coding Standards

## General Principles

- Write clean, readable, maintainable code.
- Prefer simplicity over cleverness.
- Keep functions focused on one responsibility.
- Never duplicate business logic.
- Follow SOLID, DRY, and KISS principles.
- Production-ready code only.
- No placeholder implementations.
- No TODO comments in committed code.

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Clerk, GitHub, etc.)
  - File uploads with progress tracking
  - Long-running operations
  - Specific HTTP status codes or headers
  - Endpoints for future mobile/CLI clients
  - Third-party integrations
- Otherwise, fetch data directly in server components
- Dynamic routes for item/collection pages

## Architecture Exceptions

The Next.js rules above assume a server-rendered CRUD app. Pulse is a single
live client surface, so the deviations below are deliberate. Do not "fix" them.

- `app/page.tsx` is a client component. Geolocation, Mapbox GL, WebRTC, and the
  poll loop are all browser-only, and they share one state machine.
- Coordination uses Route Handlers under `app/api/`, not Server Actions. The
  poll loop needs a plain GET, and `navigator.sendBeacon` on tab close can only
  target a URL.
- There is no server-side data fetching. Nothing durable exists to render;
  presence arrives through the poll loop.
- Route Handlers are uncached by default in Next 16, and Cache Components is not
  enabled, so `export const dynamic = "force-dynamic"` in the existing API
  routes is redundant. Harmless where it is, but do not add it to new routes
  believing it is required.
- Request-scoped middleware belongs in `proxy.ts`. The `middleware` filename and
  named export are deprecated in Next 16. The proxy runtime is `nodejs` and is
  not configurable.
- Route Handlers return `Response.json({ error }, { status })` on failure rather
  than the `{ success, data, error }` Server Action shape. That shape still
  applies to any Server Action we add.

## File Organization

No `src/` directory - `app/` lives at the project root.

- Components: `components/[feature]/ComponentName.tsx`
- Pages: `app/[route]/page.tsx`
- Server Actions: `actions/[feature].ts`
- Types: `types/[feature].ts`
- Lib/Utils: `lib/[utility].ts`

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Tailwind v4: CSS-first config (`@theme` in `globals.css`), no `tailwind.config.js`
- No inline styles

## Database

Postgres via Prisma 7 using the `@prisma/adapter-pg` driver adapter. The client
singleton lives in `lib/prisma.ts`.

- The schema holds **coordination state only**. Presence and signal rows are
  transient: deleted on leave, on staleness, or once drained. Never add a model
  that persists user content.
- Chat text, video, and raw coordinates never reach the database. Only
  privacy-offset coordinates are stored.
- `DATABASE_URL` must be a pooled connection string in production (Neon pooler
  or PgBouncer).
- No interactive transactions (`prisma.$transaction(async tx => ...)`). They are
  unreliable over a pooler. Use independent statements, or the array form
  `$transaction([...])` when atomicity is genuinely required.
- Always import the singleton from `lib/prisma.ts`. Never construct a
  `PrismaClient` inside a route handler.
- Every write must be scoped by id. A `where: {}` update touches every session
  row in the table.
- Schema changes go through `npx prisma migrate dev --name <change>` and the
  generated migration is committed. `prisma db push` is for throwaway local
  iteration only.

## Data Fetching

- Server components fetch data directly; client components use Server Actions
  for mutations
- Validate all inputs with Zod

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
