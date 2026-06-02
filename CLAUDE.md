# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

World Cup 2026 prediction pool (quiniela) for 20–100 participants. Full project plan and decisions are in `context/plan.md`.

## Commands

All commands run from the **repo root** unless noted.

```bash
# Dev (both apps concurrently)
pnpm dev

# Individual
pnpm dev:frontend       # Next.js on :3000
pnpm dev:backend        # NestJS on :3001 (watch mode)

# Backend only
pnpm --filter backend build
pnpm --filter backend start:prod
pnpm --filter backend test

# Database
cd backend
pnpm prisma migrate dev --name <name>   # new migration
pnpm prisma migrate deploy              # apply in prod
pnpm prisma generate                    # regenerate client after schema change
pnpm prisma studio                      # GUI

# Frontend only
pnpm --filter frontend build
pnpm --filter frontend lint
```

## Architecture

### Monorepo
`pnpm-workspace.yaml` declares two packages: `frontend/` and `backend/`. No build pipeline tool (no Turborepo). Deploy independently: Vercel for frontend, Railway for backend.

### Backend (`backend/` — NestJS 11)

- **Entry**: `src/main.ts` — sets global prefix `/api`, CORS, and `ValidationPipe`
- **Module pattern**: each feature is a self-contained NestJS module (`module.ts` + `service.ts` + `controller.ts` + `dto/`)
- **`PrismaModule`** is `@Global()` — inject `PrismaService` anywhere without re-importing the module
- **Auth**: JWT via `passport-jwt`. `JwtAuthGuard` protects routes; `AdminGuard` checks `role === ADMIN`
- **Imports use `.js` extension** (`import ... from './foo.js'`) — required by `moduleResolution: nodenext` in tsconfig
- **Prisma v6** (not v7) — v7 generates ESM-only code incompatible with NestJS's CJS output

### Database (PostgreSQL + Prisma v6)

Schema at `backend/prisma/schema.prisma`. Three models:

- **`User`** — `role: USER | ADMIN`
- **`Match`** — `status: SCHEDULED | LIVE | FINISHED`, `stage: GROUP | R32 | R16 | QF | SF | FINAL`, optional `externalId` (API-Football ID)
- **`Prediction`** — `unique(userId, matchId)`, stores predicted `homeScore` + `awayScore`

Scoring: 3 pts exact result, 1 pt correct outcome (win/draw/loss), 0 pts otherwise.

### Frontend (`frontend/` — Next.js 15)

- **App Router** with `src/app/` directory
- **shadcn/ui** (style: `base-nova`) — add components with `pnpm dlx shadcn@latest add <component>` from within `frontend/`
- **TanStack Query** for server state and polling (leaderboard refreshes every 30 s)
- **axios** for API calls to the NestJS backend
- API base URL: `http://localhost:3001` in dev, env var in prod

### Key env vars

**`backend/.env`**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRATION=7d
API_FOOTBALL_KEY=...
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### pnpm workspace gotcha

When adding new packages that require build scripts, pnpm will block the install and ask you to set `allowBuilds` in `pnpm-workspace.yaml`. Add the package name with `true` there, then re-run `pnpm install` from the root.
