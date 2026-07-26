# CV Maker AI — repo guide

## Stack
- **Next.js 16** App Router with Turbopack — do NOT guess APIs from older versions; check `node_modules/next/dist/docs/` first
- **React 19.2** with React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- **Tailwind CSS v4** — uses `@import "tailwindcss"` + `@theme` directives (NOT v3 `@tailwind`/`@apply` config)
- **shadcn/ui** (`style: "base-mira"`) via `@shadcn/react` package
- **tRPC v11** — router in `server/trpc/routers/`, client in `lib/trpc/`, adapter at `app/api/trpc/[trpc]/route.ts`
- **Better Auth** — handler at `app/api/auth/[...all]/route.ts`, proxy check in `proxy.ts` (Next.js 16's renamed middleware)
- **MongoDB** via **Prisma** (`provider: "mongodb"`) — CV sections are embedded MongoDB composite types, not relational
- **Zustand** for CV builder state + custom 800ms debounced autosave hook
- **Zod** schemas in `lib/schemas/cv.ts` — single source of truth for tRPC input validation and react-hook-form
- **Biome v2** for linting/formatting (VCS-aware, respects `.gitignore`)
- **PostHog** for analytics; **Upstash Redis** for caching; **Puppeteer-core + @sparticuz/chromium** for PDF export

## Key commands (use pnpm)
| Command | Action |
|---------|--------|
| `pnpm dev` | Dev server (port 3000) |
| `pnpm build` | Production build |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format --write |
| `pnpm db:push` | Push Prisma schema to MongoDB |
| `pnpm db:generate` | Regenerate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |

`postinstall` hook auto-runs `prisma generate`.

## Architecture
- **`app/(auth)/`** — route group for protected pages (server-side session check in `page.tsx`)
- **`app/(auth)/builder/`** — CV dashboard; **`app/(auth)/builder/[cvId]/`** — editor
- **`app/api/auth/[...all]/route.ts`** — Better Auth handler (captures all auth endpoints)
- **`app/api/trpc/[trpc]/route.ts`** — tRPC fetch handler
- **`server/trpc/routers/cv.ts`** — CRUD for CVs (ownership-enforced via `userId` match, no formal Prisma relation to User)
- **`lib/stores/cv-store.ts`** — Zustand store holding all CV content + builder UI state
- **`lib/schemas/cv.ts`** — Zod schemas + empty defaults for every CV section
- **`hooks/use-cv-autosave.ts`** — subscribes to store `revision`, debounces 800ms, calls `trpc.cv.update`
- **`components/cv/templates/`** — CV render templates (only `classic` currently)
- **`proxy.ts`** — Next.js 16 proxy (replaces `middleware.ts`); optimistic auth check via session cookie

## Conventions
- All DB access through tRPC backend — no direct client-to-MongoDB
- CV ownership: `userId` string matches Better Auth user ID (no formal Prisma relation to avoid coupling)
- `@/*` path alias maps to project root
- CSS: `globals.css` uses `@import "tailwindcss"` + `@theme inline {}` for design tokens + `@utility` for custom utilities
- Validate with Zod on both tRPC input (server) and react-hook-form resolver (client)
- shadcn components in `components/ui/`, CV-specific in `components/cv/`
- Dev-only: `<Agentation />` renders in `layout.tsx` when `NODE_ENV === "development"`
