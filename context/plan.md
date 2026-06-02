# Plan: Quiniela FIFA World Cup 2026

## Context
Samuel quiere construir una quiniela para el Mundial 2026 de fútbol, bien hecha y con tiempo suficiente (el torneo arranca en junio 2026). El objetivo es tener control total sobre la base de datos y el backend, con actualizaciones de resultados en tiempo real vía API externa (API-Football), sin intervención manual. El grupo objetivo es 20-100 participantes.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Auth | Email + password (JWT) |
| Puntuación grupos | 3pts resultado exacto, 1pt outcome correcto, 0pts fallo |
| Puntuación knockout | Multiplicador por ronda (ver tabla abajo) |
| Deadline fase de grupos | Antes del partido inaugural |
| Deadline fase eliminatoria | Antes del primer partido de R32 (~2 julio 2026) |
| Quiniela en dos fases | Grupos primero, knockout cuando se concretan los cruces |
| Participantes | 20–100 personas |
| API de resultados | API-Football (free tier, 100 req/día) — cambiar si hace falta |
| Base de datos | PostgreSQL local con migraciones (Prisma v6) |
| Estructura | Monorepo pnpm workspaces (sin Turborepo) |
| Deploy | Vercel (frontend/) + Railway (backend/) |
| Email | Resend (free tier: 3,000 emails/mes) |

### Tabla de puntos por ronda

| Ronda | Pts resultado exacto | Pts outcome correcto |
|---|---|---|
| Grupos (48 partidos) | 3 | 1 |
| R32 | 3 | 1 |
| Octavos — R16 | 6 | 2 |
| Cuartos — QF | 9 | 3 |
| Semis — SF | 12 | 4 |
| Final | 15 | 5 |

---

## Tech Stack

```
predictions-fwc-2026/
├── frontend/         # Next.js 16 + React + Tailwind v4 + TypeScript
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
- Resend para emails transaccionales (recordatorio fase eliminatoria)
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
               status (SCHEDULED | LIVE | FINISHED), stage (GROUP | R32 | R16 | QF | SF | FINAL),
               groupName?, phase (GROUP_STAGE | KNOCKOUT)
Prediction   — id, userId, matchId, homeScore, awayScore, createdAt, updatedAt
              — unique(userId, matchId)
```

El leaderboard se calcula dinámicamente en el backend cruzando `Prediction` vs `Match`, aplicando el multiplicador de puntos según el `stage` del partido.

---

## Sistema de dos fases

### Fase de grupos
- Deadline: antes del partido inaugural (11 junio 2026)
- 48 partidos con equipos reales hardcodeados en seed
- Al cerrar el deadline, las predicciones se bloquean

### Fase eliminatoria
- Deadline: antes del primer partido de R32 (~2 julio 2026, cuando terminen los grupos)
- El admin activa la fase: completa los equipos reales en los slots de R32 (que estaban como TBD)
- El sistema envía un email a todos los participantes via Resend notificando que la fase está abierta
- Los usuarios entran y predicen los 32 partidos de knockout
- Puntos con multiplicador por ronda

### Email de recordatorio (Resend)
- Trigger: cuando el admin activa la fase eliminatoria
- Destinatarios: todos los usuarios registrados
- Contenido: link directo a la sección de predicciones de knockout, deadline
- También se puede enviar reminder 24h antes del cierre

---

## Features por módulo

### 1. Auth ✅
- `POST /api/auth/register` (email, password, name) → JWT
- `POST /api/auth/login` → JWT
- `GET /api/auth/me` (protegido con `JwtAuthGuard`)
- `AdminGuard` para rutas de administración (role === ADMIN)

### 2. Matches
- Seed hardcodeado: 48 partidos de fase de grupos con datos reales del Mundial 2026
- Slots R32/R16/QF/SF/Final como TBD, se completan cuando el admin activa la fase knockout
- `GET /api/matches` → lista de partidos con score actual, agrupados por fase/ronda
- `PATCH /api/matches/:id` (admin) → actualizar equipos de un slot knockout
- Job cada 60s cuando hay partidos LIVE → llama API-Football → actualiza scores en DB
  - Polling inteligente: si no hay partidos LIVE ese día, no se hacen calls (cuida el 100 req/día)

### 3. Predictions
- `POST /api/predictions/bulk` → guarda/actualiza múltiples predicciones de una vez
- `PUT /api/predictions/:matchId` → actualiza predicción individual (auto-save, debounce 1s)
- `GET /api/predictions/me` → mis predicciones
- `GET /api/predictions/user/:userId` → predicciones de otro usuario (read-only)
- Escritura bloqueada según la fase activa (verificar deadline de cada fase)

### 4. Leaderboard
- `GET /api/leaderboard` → lista de usuarios con puntos totales, ordenados
- Cálculo con multiplicador por ronda según tabla de puntos
- Partidos LIVE: puntos parciales con score actual

### 5. Emails (Resend)
- Activación fase eliminatoria → email a todos los participantes
- Reminder 24h antes del cierre de la fase eliminatoria

### 6. Landing page
- Hero + "¿Cómo funciona?" + Premios (placeholder) + CTA

### 7. App (rutas protegidas Next.js)
- `/predictions` → fase de grupos: 48 partidos, auto-save, barra de progreso
- `/predictions/knockout` → fase eliminatoria: 32 partidos (visible solo cuando el admin la activa)
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
7. Migración: agregar campo `phase` a `Match` (GROUP_STAGE | KNOCKOUT)
8. Seed hardcodeado: 48 partidos de grupos del Mundial 2026 + 32 slots knockout TBD
9. Módulo Matches: `GET /api/matches` agrupado por fase/ronda
10. Módulo Predictions: bulk save + auto-save + bloqueo por deadline de fase
11. Vista de predicciones de otros usuarios (read-only)

### Fase 3 — Live & Leaderboard
12. Integración API-Football (polling inteligente con @nestjs/schedule)
13. Módulo Leaderboard con cálculo de puntos + multiplicadores por ronda
14. Polling desde el frontend con TanStack Query (cada 30s en leaderboard)

### Fase 4 — Emails & Admin
15. Integración Resend: email de activación fase knockout + reminder 24h
16. Endpoint admin para activar fase knockout y completar slots de equipos
17. Job programado para reminder automático 24h antes del deadline

### Fase 5 — UI & Polish
18. Landing page con copy y sección de premios
19. Páginas de predicciones (grupos + knockout), auto-save, barra de progreso
20. Leaderboard UI en tiempo real
21. Mejoras de UX: loading states, toasts, mobile responsive
22. Deploy a Vercel + Railway

---

## Consideraciones pendientes
- **Penaltis/tiempo extra**: ¿resultado con penaltis o solo tiempo reglamentario? Definir en Fase 3
- **Premios**: copy placeholder por ahora
- **Invitaciones**: registro abierto por ahora, luego se puede restringir con invite link

---

## Verificación por fase
- **Fase 1** ✅: `pnpm dev` levanta ambas apps, login devuelve JWT, rutas protegidas rechazan sin token
- **Fase 2**: usuario puede ingresar 48 predicciones de grupos, salirse, volver y verlas guardadas
- **Fase 3**: con un partido LIVE, score se actualiza en DB en <2min y leaderboard refleja puntos con multiplicador correcto
- **Fase 4**: al activar fase knockout, todos los usuarios reciben el email de Resend con el link
- **Fase 5**: deploy funcionando en Vercel + Railway con variables de entorno correctas
