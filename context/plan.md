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
| Base de datos | PostgreSQL local con migraciones (Prisma) |
| Estructura | Monorepo pnpm workspaces (sin Turborepo) |
| Deploy | Vercel (frontend/) + Railway (backend/) |

---

## Tech Stack

```
predictions-fwc-2026/
├── frontend/         # Next.js 15 + React + Tailwind + TypeScript
├── backend/          # NestJS + TypeScript + Prisma
├── context/          # Documentación y plan del proyecto
├── pnpm-workspace.yaml
├── package.json
└── .env
```

**Deploy:**
- **Vercel**: conectar el repo, configurar root directory → `frontend/`. Sin configuración extra.
- **Railway**: conectar el mismo repo, configurar root directory → `backend/`. Variables de entorno en Railway dashboard.

**Backend (`backend/` — NestJS):**
- Prisma ORM + PostgreSQL (migraciones versionadas)
- JWT auth (access token simple, sin refresh por ahora)
- bcrypt para passwords
- @nestjs/schedule para el job de polling de API-Football

**Frontend (`frontend/` — Next.js 15):**
- App Router
- Tailwind CSS
- React Query (TanStack Query) para polling del leaderboard / live scores
- shadcn/ui para componentes base

---

## Base de datos (schema Prisma)

```
User         — id, email, passwordHash, name, role (USER | ADMIN), createdAt
Match        — id, externalId, homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status (SCHEDULED | LIVE | FINISHED), stage (GROUP | R16 | QF | SF | FINAL), groupName
Prediction   — id, userId, matchId, homeScore, awayScore, createdAt, updatedAt
              — unique(userId, matchId)
```

El leaderboard se calcula dinámicamente en el backend con una query que cruza `Prediction` vs `Match`.

---

## Features por módulo

### 1. Auth
- POST /auth/register (email, password, name)
- POST /auth/login → JWT
- Middleware de guard en rutas protegidas
- Rol ADMIN para Samuel (seed manual o script)

### 2. Matches
- Seed inicial: todos los partidos de la fase de grupos (48 partidos) + slots de eliminación directa
- GET /matches → lista de partidos con score actual
- Job cada 60s cuando hay partidos LIVE → llama API-Football → actualiza scores en DB
  - Con caching: si no hay partidos live ese día, no se hacen calls → se cuida el rate limit de 100 req/día

### 3. Predictions
- POST /predictions (bulk: array de predicciones) → guarda o actualiza
- PATCH /predictions/:id → actualiza una predicción (auto-save por partido)
- GET /predictions/mine → mis predicciones
- GET /predictions/user/:userId → predicciones de otro usuario (read-only, solo visible después del inicio del torneo)
- Se bloquea escritura cuando el torneo inicia (verificar fecha del primer partido)

### 4. Leaderboard
- GET /leaderboard → lista de usuarios con puntos totales, ordenados
- Cálculo: por cada partido FINISHED, compara prediction vs resultado real
  - 3pts si home_score y away_score exactos
  - 1pt si solo acertó outcome (ganó local, ganó visitante, o empate)
  - 0pts otherwise
- Para partidos LIVE: calcula puntos parciales con score actual

### 5. Landing page (Next.js)
- Sección hero con copy placeholder
- Sección "¿Cómo funciona?" (pasos)
- Sección Premios (placeholder)
- CTA → Registrarse / Ingresar

### 6. App (rutas protegidas)
- `/predictions` → formulario de todos los partidos, auto-save por partido (debounce 1s), barra de progreso
- `/predictions/[userId]` → ver pronósticos de otro participante (read-only)
- `/leaderboard` → tabla de puntajes en tiempo real (polling cada 30s)
- `/matches` → lista de partidos con score live

---

## Fases de desarrollo

### Fase 1 — Fundación ✅
1. Crear carpeta `context/` con el plan del proyecto
2. Scaffold monorepo pnpm workspaces (`frontend/` + `backend/`)
3. NestJS con Prisma + PostgreSQL conectado y migraciones funcionando
4. Next.js con Tailwind + shadcn/ui configurado
5. Auth completo (register, login, JWT guard)

### Fase 2 — Core del negocio
6. Seed de todos los partidos del Mundial 2026 (48 grupos + slots knockout)
7. Módulo de predicciones (CRUD + bulk save + auto-save)
8. Bloqueo de predicciones al inicio del torneo
9. Vista de predicciones de otros usuarios

### Fase 3 — Live & Leaderboard
10. Integración API-Football (polling inteligente: solo cuando hay partidos live)
11. Leaderboard con cálculo de puntos (incluye parciales en partidos live)
12. Polling desde el frontend (React Query, cada 30s en leaderboard)

### Fase 4 — UI & Polish
13. Landing page con copy
14. Sección de premios
15. Mejoras de UX (loading states, toasts, mobile responsive)
16. Deploy a Vercel + Railway

---

## Consideraciones pendientes
- **Eliminación directa**: predicciones de knockout — fase de grupos primero, knockout después
- **Penaltis/tiempo extra**: ¿resultado con penaltis o solo tiempo reglamentario? A definir en Fase 3
- **Premios**: copy placeholder por ahora
- **Invitaciones**: registro abierto por ahora, luego se puede restringir con invite link

---

## Verificación por fase
- **Fase 1**: `pnpm dev` levanta web y api sin errores, login devuelve JWT, rutas protegidas rechazan sin token
- **Fase 2**: usuario puede ingresar 48 predicciones, salirse, volver y verlas guardadas; otro usuario no puede editarlas
- **Fase 3**: con un partido live, el score se actualiza en DB en <2min y el leaderboard refleja puntos parciales
- **Fase 4**: deploy funcionando en Vercel + Railway con variables de entorno correctas
