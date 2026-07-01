# Quiniela FIFA World Cup 2026

Pool de predicciones para el Mundial 2026. Los participantes pronostican resultados de la fase de grupos y, ronda a ronda, de la fase eliminatoria. Puntuación automática, leaderboard en tiempo real y cierre automático de predicciones al inicio de cada partido.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 · App Router · TypeScript · Tailwind v4 · shadcn/ui |
| Backend | NestJS 11 · TypeScript · Prisma v6 · PostgreSQL |
| Auth | JWT (7 días) · bcrypt |
| Resultados en vivo | football-data.org (cron cada 2 min) |
| Emails | Resend |


## Estructura del monorepo

```
predictions-fwc-2026/
├── frontend/          # Next.js 15
├── backend/           # NestJS 11
├── context/           # Plan del proyecto · Postman collection
├── docs/              # Manual de operaciones (gitignored — solo admin)
├── CLAUDE.md
├── pnpm-workspace.yaml
└── package.json
```

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno del backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# 3. Base de datos
cd backend
pnpm prisma migrate dev
pnpm prisma db seed   # carga los 104 partidos del Mundial + slots TBD de knockout

# 4. Dev (ambas apps en paralelo)
cd ..
pnpm dev
# Frontend → http://localhost:3000
# Backend  → http://localhost:3001
```

### Variables de entorno (`backend/.env`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/fwc2026
JWT_SECRET=cambia-esto
JWT_EXPIRATION=7d
FOOTBALL_DATA_KEY=tu-token-de-football-data.org
PORT=3001
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=tu-api-key-de-resend
EMAIL_FROM=quiniela@tudominio.com
```

## Comandos

```bash
pnpm dev                              # ambas apps en paralelo
pnpm dev:frontend                     # solo Next.js (:3000)
pnpm dev:backend                      # solo NestJS (:3001, watch mode)

# Backend
pnpm --filter backend build
pnpm --filter backend start:prod
pnpm --filter backend test
cd backend && pnpm prisma studio      # GUI de la BD

# Frontend
pnpm --filter frontend build
pnpm --filter frontend lint
```

## Puntuación

| Ronda | Resultado exacto | Outcome correcto |
|-------|-----------------|-----------------|
| Fase de grupos (48 partidos) | 3 pts | 1 pt |
| R32 (32avos) | 3 pts | 1 pt |
| R16 (Octavos) | 6 pts | 2 pts |
| QF (Cuartos) | 9 pts | 3 pts |
| SF (Semis) | 12 pts | 4 pts |
| Final | 15 pts | 5 pts |

*Outcome correcto = acertó quién gana o que fue empate, pero no el marcador exacto.*

## Flujo del torneo

```
PRE-TORNEO
  → participantes crean/editan predicciones de fase de grupos

INICIO TORNEO (primer partido)
  → backend bloquea automáticamente nuevas predicciones de grupos

ENTRE FASES (grupos → R32, R32 → R16, …)
  → admin edita los slots TBD del seed con los equipos clasificados
  → admin activa la fase → email a todos + predicciones abiertas
  → cierre automático al inicio del primer partido de esa fase
  → cron envía recordatorio 24h antes del primer partido (automático)
```

## Roles

- **USER** — ve partidos, ingresa predicciones, ve leaderboard
- **ADMIN** — todo lo anterior + gestión de partidos, activación de fases, emails de prueba

El primer admin se asigna manualmente:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'tu@email.com';
```

## API

La colección de Postman está en `context/FWC2026.postman_collection.json`.

Endpoints principales:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Registro |
| `POST` | `/api/auth/login` | Login → devuelve JWT |
| `GET` | `/api/matches` | Lista de partidos (filtrable por `?phase=`) |
| `GET` | `/api/matches/stages/status` | Estado de cada fase knockout |
| `PUT` | `/api/predictions/:matchId` | Crear/editar predicción |
| `POST` | `/api/predictions/lock-stage/:stage` | Finalizar fase manualmente |
| `GET` | `/api/leaderboard` | Clasificación general |
| `PATCH` | `/api/admin/matches/:id` | Editar equipos/fecha de un partido |
| `DELETE` | `/api/admin/matches/:id` | Eliminar partido |
| `POST` | `/api/admin/stages/:stage/activate` | Activar fase knockout |
| `GET` | `/api/admin/stages/status` | Estado de fases (admin) |
| `GET` | `/api/admin/config/prediction-lead-time` | Minutos de cierre antes de cada partido knockout |
| `PUT` | `/api/admin/config/prediction-lead-time` | Actualizar el tiempo de cierre (default 60 min) |

## Licencia

Uso privado.
