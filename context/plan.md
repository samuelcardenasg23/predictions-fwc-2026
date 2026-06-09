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
               status (SCHEDULED | LIVE | FINISHED),
               stage (GROUP | R32 | R16 | QF | SF | THIRD_PLACE | FINAL),
               phase (GROUP_STAGE | KNOCKOUT), groupName?, matchOrder?
Prediction   — id, userId, matchId, homeScore, awayScore, createdAt, updatedAt
              — unique(userId, matchId)
```

El leaderboard se calcula dinámicamente en el backend cruzando `Prediction` vs `Match`, aplicando el multiplicador de puntos según el `stage` del partido.

---

## Sistema de dos fases

### Fase de grupos
- Deadline: antes del partido inaugural (11 junio 2026, 19:00 UTC — México vs Sudáfrica)
- 72 partidos en 12 grupos (A–L) de 4 equipos, con equipos y horarios reales del fixture oficial
- Al cerrar el deadline, las predicciones se bloquean (match.scheduledAt <= now())

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
- Seed: 72 partidos de fase de grupos (12 grupos A–L × 6 partidos) + 32 slots knockout (R32×16, R16×8, QF×4, SF×2, THIRD_PLACE×1, FINAL×1) = 104 total
- Slots knockout como TBD, se completan cuando el admin activa la fase eliminatoria
- `GET /api/matches?phase=&stage=` → lista de partidos, filtros opcionales
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

### Fase 2 — Core del negocio ✅ (completada 2026-06-02)
7. ✅ Migración: `MatchPhase` enum (GROUP_STAGE | KNOCKOUT) + `THIRD_PLACE` en `MatchStage` + campos `phase` y `matchOrder` en Match
8. ✅ Seed: 72 partidos de grupos (12 grupos A–L × 4 equipos × 6 partidos, horarios reales del fixture oficial Fox Sports/FIFA en UTC) + 32 slots knockout (R32×16, R16×8, QF×4, SF×2, THIRD_PLACE×1, FINAL×1) = 104 total
9. ✅ Módulo Matches: `GET /api/matches?phase=&stage=`, `GET /api/matches/:id`, `PATCH /api/matches/:id` (admin)
10. ✅ Módulo Predictions: `PUT /api/predictions/:matchId` (auto-save), `POST /api/predictions/bulk`, bloqueo automático si `match.scheduledAt <= now()`
11. ✅ Vista predicciones ajena: `GET /api/predictions/user/:userId` (read-only)

### Fase 3 — Live & Leaderboard ✅ (completada 2026-06-03)
12. ✅ Integración API-Football — `FootballApiService` con native fetch, league=1 (WC), sin especificar season (limitación free tier). Polling inteligente: cron cada 2 min, solo llama API si hay partidos hoy en DB dentro de la ventana activa [-130min, +10min]. Un solo call `GET /fixtures?live=all&league=1` obtiene todos los partidos en vivo.
13. ✅ Módulo Leaderboard con cálculo de puntos + multiplicadores por ronda: `GET /api/leaderboard` devuelve ranking ordenado con totalPoints, exactPredictions, outcomePredictions
14. Polling desde el frontend con TanStack Query (cada 30s en leaderboard) — pendiente Fase 5 (UI)

### Fase 4 — Emails & Admin ✅ (completada 2026-06-04)
15. ✅ Integración Resend: EmailService con batch sending (hasta 100 emails/call). Templates HTML para activación de knockout y reminder 24h. Env vars: RESEND_API_KEY, RESEND_FROM_EMAIL, FRONTEND_URL.
16. ✅ POST /api/admin/activate-knockout (AdminGuard): valida que existan R32 slots, obtiene fecha del primer R32, envía email a todos los usuarios, guarda flag en SystemConfig.
17. ✅ Cron diario 12:00 UTC: detecta si el primer R32 SCHEDULED está dentro de las próximas 25h → envía reminder una sola vez (flag knockout_reminder_sent en SystemConfig).
18. ✅ Migración SystemConfig: tabla key-value para flags de sistema (knockout_activated, knockout_reminder_sent).

### Fase 5 — UI & Polish ✅ (completada 2026-06-04)
18. ✅ Landing page: hero, "¿Cómo funciona?", tabla de puntos, CTAs
19. ✅ Login + Register con validación y toast de error/éxito
20. ✅ Página de predicciones grupos: 72 partidos agrupados por grupo, autosave con debounce 1s, barra de progreso, skeleton loaders, partidos pasados bloqueados con candado
21. ✅ Página knockout: muestra partidos por ronda, estado vacío si todos son TBD
22. ✅ Vista predicciones ajena (/predictions/[userId]): read-only
23. ✅ Leaderboard: tabla con polling 30s (TanStack Query refetchInterval), medallas 🥇🥈🥉, link a predicciones de cada jugador, badge "Tú" propio
24. ✅ Nav sticky con auth state (muestra nombre + botón salir si autenticado)
25. ✅ AuthContext (localStorage), QueryProvider (TanStack Query), Toaster (sonner)
26. ✅ Interceptor axios: agrega Bearer token y redirige a /login en 401
27. Deploy — pendiente (estrategia TBD)

---

## Consideraciones pendientes
- **Penaltis/tiempo extra**: ¿resultado con penaltis o solo tiempo reglamentario? Definir en Fase 3
- **Premios**: copy placeholder por ahora
- **Invitaciones**: registro abierto por ahora, luego se puede restringir con invite link

---

## Verificación por fase
- **Fase 1** ✅: `pnpm dev` levanta ambas apps, login devuelve JWT, rutas protegidas rechazan sin token
- **Fase 2** ✅: usuario puede ingresar 48 predicciones de grupos vía bulk o auto-save, verlas en `GET /predictions/me`, y ver las de otro usuario en `GET /predictions/user/:id`
- **Fase 3** ✅: con un partido LIVE, score se actualiza en DB en <2min y leaderboard refleja puntos con multiplicador correcto
- **Fase 4** ✅: al activar fase knockout, todos los usuarios reciben el email de Resend con el link
- **Fase 5**: deploy — estrategia TBD
