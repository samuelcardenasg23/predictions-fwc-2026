# Plan: Quiniela FIFA World Cup 2026

## Context
Samuel quiere construir una quiniela para el Mundial 2026 de fútbol, bien hecha y con tiempo suficiente (el torneo arranca en junio 2026). El objetivo es tener control total sobre la base de datos y el backend, con actualizaciones de resultados en tiempo real vía API externa (API-Football), sin intervención manual. El grupo objetivo es 20-100 participantes.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Auth | Email + password (JWT) |
| Puntuación | 3pts resultado exacto, 1pt acertar ganador/empate, 0pts fallo |
| Deadline pronósticos | Antes de que empiece el mundial (se bloquean al inicio del torneo) |
| Participantes | 20–100 personas |
| API de resultados | API-Football (free tier, 100 req/día) — cambiar si hace falta |
| Base de datos | PostgreSQL local con migraciones (Prisma v6) |
| Estructura | Monorepo pnpm workspaces (sin Turborepo) |
| Deploy | Vercel (frontend/) + Railway (backend/) |

---

## Tech Stack

```
predictions-fwc-2026/
├── frontend/         # Next.js 15 + React + Tailwind v4 + TypeScript
├── backend/          # NestJS 11 + TypeScript + Prisma v6
├── context/          # Documentación y plan del proyecto
├── CLAUDE.md         # Guía para Claude Code
├── pnpm-workspace.yaml
└── package.json      # scripts raíz con concurrently
```

**Deploy:**
- **Vercel**: conectar el repo, configurar root directory → `frontend/`. Sin configuración extra.
- **Railway**: conectar el mismo repo, configurar root directory → `backend/`. Variables de entorno en Railway dashboard.

**Backend (`backend/` — NestJS 11):**
- Prisma v6 + PostgreSQL (migraciones versionadas). **No usar Prisma v7** — genera código ESM incompatible con el output CJS de NestJS.
- JWT auth (access token simple `7d`, sin refresh por ahora)
- bcrypt para passwords
- @nestjs/schedule para el job de polling de API-Football
- Imports con extensión `.js` explícita (requerido por `moduleResolution: nodenext`)

**Frontend (`frontend/` — Next.js 16):**
- App Router con `src/app/`
- Tailwind v4 + shadcn/ui (style: `base-nova`) — agregar componentes con `pnpm dlx shadcn@latest add <component>` desde `frontend/`
- TanStack Query v5 para polling del leaderboard / live scores
- axios para llamadas a la API

---

## Base de datos (schema Prisma v6)

```
User         — id, email, passwordHash, name, role (USER | ADMIN), createdAt
Match        — id, externalId?, homeTeam, awayTeam, scheduledAt, homeScore?, awayScore?,
               status (SCHEDULED | LIVE | FINISHED), stage (GROUP | R32 | R16 | QF | SF | FINAL), groupName?
Prediction   — id, userId, matchId, homeScore, awayScore, createdAt, updatedAt
              — unique(userId, matchId)
```

El leaderboard se calcula dinámicamente en el backend cruzando `Prediction` vs `Match`.

---

## Features por módulo

### 1. Auth ✅
- `POST /api/auth/register` (email, password, name) → JWT
- `POST /api/auth/login` → JWT
- `GET /api/auth/me` (protegido con `JwtAuthGuard`)
- `AdminGuard` para rutas de administración (role === ADMIN)

### 2. Matches
- Seed inicial: 48 partidos de fase de grupos + 16 slots de eliminación directa
- `GET /api/matches` → lista de partidos con score actual
- Job cada 60s cuando hay partidos LIVE → llama API-Football → actualiza scores en DB
  - Polling inteligente: si no hay partidos LIVE ese día, no se hacen calls (cuida el rate limit de 100 req/día)

### 3. Predictions
- `POST /api/predictions/bulk` → guarda/actualiza múltiples predicciones de una vez
- `PUT /api/predictions/:matchId` → actualiza predicción individual (auto-save por partido, debounce 1s)
- `GET /api/predictions/me` → mis predicciones
- `GET /api/predictions/user/:userId` → predicciones de otro usuario (read-only, visible solo después del inicio del torneo)
- Escritura bloqueada cuando el torneo inicia (verificar `scheduledAt` del primer partido)

### 4. Leaderboard
- `GET /api/leaderboard` → lista de usuarios con puntos totales, ordenados
- Cálculo por partido FINISHED: 3pts resultado exacto, 1pt outcome correcto, 0pts fallo
- Partidos LIVE: puntos parciales con score actual

### 5. Landing page
- Hero + "¿Cómo funciona?" + Premios (placeholder) + CTA

### 6. App (rutas protegidas Next.js)
- `/predictions` → formulario todos los partidos, auto-save, barra de progreso
- `/predictions/[userId]` → pronósticos de otro participante (read-only)
- `/leaderboard` → tabla en tiempo real (polling 30s)
- `/matches` → lista de partidos con score live

---

## Fases de desarrollo

### Fase 1 — Fundación ✅ (completada 2026-06-02)
1. ✅ Monorepo pnpm workspaces (`frontend/` + `backend/` + `context/`)
2. ✅ NestJS 11 + Prisma v6 + PostgreSQL, migración `init` aplicada
3. ✅ Next.js 16 + Tailwind v4 + shadcn/ui + TanStack Query + axios
4. ✅ Auth completo: register, login, JWT guard, AdminGuard
5. ✅ `pnpm dev` con concurrently levanta ambas apps
6. ✅ CLAUDE.md con arquitectura y comandos

### Fase 2 — Core del negocio
7. Seed de partidos del Mundial 2026 (48 grupos + 16 slots knockout)
8. Módulo Matches: `GET /api/matches`
9. Módulo Predictions: bulk save + auto-save + bloqueo al inicio del torneo
10. Vista de predicciones de otros usuarios (read-only)

### Fase 3 — Live & Leaderboard
11. Integración API-Football (polling inteligente con @nestjs/schedule)
12. Módulo Leaderboard con cálculo de puntos (incluye parciales en partidos LIVE)
13. Polling desde el frontend con TanStack Query (cada 30s en leaderboard)

### Fase 4 — UI & Polish
14. Landing page con copy y sección de premios
15. Mejoras de UX: loading states, toasts, mobile responsive
16. Deploy a Vercel + Railway

---

## Consideraciones pendientes
- **Eliminación directa**: fase de grupos primero; predicciones de knockout se abren cuando se concretan los cruces
- **Penaltis/tiempo extra**: ¿resultado con penaltis o solo tiempo reglamentario? Definir en Fase 3
- **Premios**: copy placeholder por ahora
- **Invitaciones**: registro abierto por ahora, luego se puede restringir con invite link

---

## Verificación por fase
- **Fase 1** ✅: `pnpm dev` levanta ambas apps, login devuelve JWT, rutas protegidas rechazan sin token
- **Fase 2**: usuario puede ingresar 48 predicciones, salirse, volver y verlas guardadas; otro usuario no puede editarlas
- **Fase 3**: con un partido LIVE, score se actualiza en DB en <2min y leaderboard refleja puntos parciales
- **Fase 4**: deploy funcionando en Vercel + Railway con variables de entorno correctas
