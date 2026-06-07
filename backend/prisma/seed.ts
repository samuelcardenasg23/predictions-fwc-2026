import { PrismaClient, MatchStage, MatchPhase, MatchStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// All times are UTC. Source: football-data.org (verified June 2026)

const groupMatches: Array<{
  homeTeam: string;
  awayTeam: string;
  scheduledAt: Date;
  groupName: string;
}> = [
  // ── GROUP A: Mexico, South Africa, South Korea, Czechia ──────────────────
  { homeTeam: 'México',       awayTeam: 'Sudáfrica',   scheduledAt: new Date('2026-06-11T19:00:00Z'), groupName: 'A' },
  { homeTeam: 'Corea del Sur', awayTeam: 'Chequia',    scheduledAt: new Date('2026-06-12T02:00:00Z'), groupName: 'A' },
  { homeTeam: 'Chequia',      awayTeam: 'Sudáfrica',   scheduledAt: new Date('2026-06-18T16:00:00Z'), groupName: 'A' },
  { homeTeam: 'México',       awayTeam: 'Corea del Sur',scheduledAt: new Date('2026-06-19T01:00:00Z'), groupName: 'A' },
  { homeTeam: 'Chequia',      awayTeam: 'México',      scheduledAt: new Date('2026-06-25T01:00:00Z'), groupName: 'A' },
  { homeTeam: 'Sudáfrica',    awayTeam: 'Corea del Sur',scheduledAt: new Date('2026-06-25T01:00:00Z'), groupName: 'A' },

  // ── GROUP B: Canada, Bosnia and Herzegovina, Switzerland, Qatar ───────────
  { homeTeam: 'Canadá',       awayTeam: 'Bosnia y Herzegovina', scheduledAt: new Date('2026-06-12T19:00:00Z'), groupName: 'B' },
  { homeTeam: 'Qatar',        awayTeam: 'Suiza',       scheduledAt: new Date('2026-06-13T19:00:00Z'), groupName: 'B' },
  { homeTeam: 'Suiza',        awayTeam: 'Bosnia y Herzegovina', scheduledAt: new Date('2026-06-18T19:00:00Z'), groupName: 'B' },
  { homeTeam: 'Canadá',       awayTeam: 'Qatar',       scheduledAt: new Date('2026-06-18T22:00:00Z'), groupName: 'B' },
  { homeTeam: 'Suiza',        awayTeam: 'Canadá',      scheduledAt: new Date('2026-06-24T19:00:00Z'), groupName: 'B' },
  { homeTeam: 'Bosnia y Herzegovina', awayTeam: 'Qatar', scheduledAt: new Date('2026-06-24T19:00:00Z'), groupName: 'B' },

  // ── GROUP C: Brazil, Morocco, Haiti, Scotland ────────────────────────────
  { homeTeam: 'Brasil',       awayTeam: 'Marruecos',   scheduledAt: new Date('2026-06-13T22:00:00Z'), groupName: 'C' },
  { homeTeam: 'Haití',        awayTeam: 'Escocia',     scheduledAt: new Date('2026-06-14T01:00:00Z'), groupName: 'C' },
  { homeTeam: 'Escocia',      awayTeam: 'Marruecos',   scheduledAt: new Date('2026-06-19T22:00:00Z'), groupName: 'C' },
  { homeTeam: 'Brasil',       awayTeam: 'Haití',       scheduledAt: new Date('2026-06-20T00:30:00Z'), groupName: 'C' },
  { homeTeam: 'Escocia',      awayTeam: 'Brasil',      scheduledAt: new Date('2026-06-24T22:00:00Z'), groupName: 'C' },
  { homeTeam: 'Marruecos',    awayTeam: 'Haití',       scheduledAt: new Date('2026-06-24T22:00:00Z'), groupName: 'C' },

  // ── GROUP D: USA, Paraguay, Australia, Türkiye ───────────────────────────
  { homeTeam: 'Estados Unidos', awayTeam: 'Paraguay',  scheduledAt: new Date('2026-06-13T01:00:00Z'), groupName: 'D' },
  { homeTeam: 'Australia',    awayTeam: 'Turquía',     scheduledAt: new Date('2026-06-14T04:00:00Z'), groupName: 'D' },
  { homeTeam: 'Estados Unidos', awayTeam: 'Australia', scheduledAt: new Date('2026-06-19T19:00:00Z'), groupName: 'D' },
  { homeTeam: 'Turquía',      awayTeam: 'Paraguay',    scheduledAt: new Date('2026-06-20T03:00:00Z'), groupName: 'D' },
  { homeTeam: 'Turquía',      awayTeam: 'Estados Unidos', scheduledAt: new Date('2026-06-26T02:00:00Z'), groupName: 'D' },
  { homeTeam: 'Paraguay',     awayTeam: 'Australia',   scheduledAt: new Date('2026-06-26T02:00:00Z'), groupName: 'D' },

  // ── GROUP E: Germany, Curaçao, Ivory Coast, Ecuador ─────────────────────
  { homeTeam: 'Alemania',     awayTeam: 'Curazao',     scheduledAt: new Date('2026-06-14T17:00:00Z'), groupName: 'E' },
  { homeTeam: 'Costa de Marfil', awayTeam: 'Ecuador',  scheduledAt: new Date('2026-06-14T23:00:00Z'), groupName: 'E' },
  { homeTeam: 'Alemania',     awayTeam: 'Costa de Marfil', scheduledAt: new Date('2026-06-20T20:00:00Z'), groupName: 'E' },
  { homeTeam: 'Ecuador',      awayTeam: 'Curazao',     scheduledAt: new Date('2026-06-21T00:00:00Z'), groupName: 'E' },
  { homeTeam: 'Ecuador',      awayTeam: 'Alemania',    scheduledAt: new Date('2026-06-25T20:00:00Z'), groupName: 'E' },
  { homeTeam: 'Curazao',      awayTeam: 'Costa de Marfil', scheduledAt: new Date('2026-06-25T20:00:00Z'), groupName: 'E' },

  // ── GROUP F: Netherlands, Japan, Sweden, Tunisia ─────────────────────────
  { homeTeam: 'Países Bajos', awayTeam: 'Japón',       scheduledAt: new Date('2026-06-14T20:00:00Z'), groupName: 'F' },
  { homeTeam: 'Suecia',       awayTeam: 'Túnez',       scheduledAt: new Date('2026-06-15T02:00:00Z'), groupName: 'F' },
  { homeTeam: 'Países Bajos', awayTeam: 'Suecia',      scheduledAt: new Date('2026-06-20T17:00:00Z'), groupName: 'F' },
  { homeTeam: 'Túnez',        awayTeam: 'Japón',       scheduledAt: new Date('2026-06-21T04:00:00Z'), groupName: 'F' },
  { homeTeam: 'Túnez',        awayTeam: 'Países Bajos',scheduledAt: new Date('2026-06-25T23:00:00Z'), groupName: 'F' },
  { homeTeam: 'Japón',        awayTeam: 'Suecia',      scheduledAt: new Date('2026-06-25T23:00:00Z'), groupName: 'F' },

  // ── GROUP G: Belgium, Egypt, Iran, New Zealand ───────────────────────────
  { homeTeam: 'Bélgica',      awayTeam: 'Egipto',      scheduledAt: new Date('2026-06-15T19:00:00Z'), groupName: 'G' },
  { homeTeam: 'Irán',         awayTeam: 'Nueva Zelanda',scheduledAt: new Date('2026-06-16T01:00:00Z'), groupName: 'G' },
  { homeTeam: 'Bélgica',      awayTeam: 'Irán',        scheduledAt: new Date('2026-06-21T19:00:00Z'), groupName: 'G' },
  { homeTeam: 'Nueva Zelanda',awayTeam: 'Egipto',      scheduledAt: new Date('2026-06-22T01:00:00Z'), groupName: 'G' },
  { homeTeam: 'Nueva Zelanda',awayTeam: 'Bélgica',     scheduledAt: new Date('2026-06-27T03:00:00Z'), groupName: 'G' },
  { homeTeam: 'Egipto',       awayTeam: 'Irán',        scheduledAt: new Date('2026-06-27T03:00:00Z'), groupName: 'G' },

  // ── GROUP H: Spain, Cape Verde, Saudi Arabia, Uruguay ────────────────────
  { homeTeam: 'España',       awayTeam: 'Cabo Verde',  scheduledAt: new Date('2026-06-15T16:00:00Z'), groupName: 'H' },
  { homeTeam: 'Arabia Saudita',awayTeam: 'Uruguay',    scheduledAt: new Date('2026-06-15T22:00:00Z'), groupName: 'H' },
  { homeTeam: 'España',       awayTeam: 'Arabia Saudita', scheduledAt: new Date('2026-06-21T16:00:00Z'), groupName: 'H' },
  { homeTeam: 'Uruguay',      awayTeam: 'Cabo Verde',  scheduledAt: new Date('2026-06-21T22:00:00Z'), groupName: 'H' },
  { homeTeam: 'Uruguay',      awayTeam: 'España',      scheduledAt: new Date('2026-06-27T00:00:00Z'), groupName: 'H' },
  { homeTeam: 'Cabo Verde',   awayTeam: 'Arabia Saudita', scheduledAt: new Date('2026-06-27T00:00:00Z'), groupName: 'H' },

  // ── GROUP I: France, Senegal, Iraq, Norway ───────────────────────────────
  { homeTeam: 'Francia',      awayTeam: 'Senegal',     scheduledAt: new Date('2026-06-16T19:00:00Z'), groupName: 'I' },
  { homeTeam: 'Irak',         awayTeam: 'Noruega',     scheduledAt: new Date('2026-06-16T22:00:00Z'), groupName: 'I' },
  { homeTeam: 'Francia',      awayTeam: 'Irak',        scheduledAt: new Date('2026-06-22T21:00:00Z'), groupName: 'I' },
  { homeTeam: 'Noruega',      awayTeam: 'Senegal',     scheduledAt: new Date('2026-06-23T00:00:00Z'), groupName: 'I' },
  { homeTeam: 'Noruega',      awayTeam: 'Francia',     scheduledAt: new Date('2026-06-26T19:00:00Z'), groupName: 'I' },
  { homeTeam: 'Senegal',      awayTeam: 'Irak',        scheduledAt: new Date('2026-06-26T19:00:00Z'), groupName: 'I' },

  // ── GROUP J: Argentina, Algeria, Austria, Jordan ─────────────────────────
  { homeTeam: 'Argentina',    awayTeam: 'Argelia',     scheduledAt: new Date('2026-06-17T01:00:00Z'), groupName: 'J' },
  { homeTeam: 'Austria',      awayTeam: 'Jordania',    scheduledAt: new Date('2026-06-17T04:00:00Z'), groupName: 'J' },
  { homeTeam: 'Argentina',    awayTeam: 'Austria',     scheduledAt: new Date('2026-06-22T17:00:00Z'), groupName: 'J' },
  { homeTeam: 'Jordania',     awayTeam: 'Argelia',     scheduledAt: new Date('2026-06-23T03:00:00Z'), groupName: 'J' },
  { homeTeam: 'Jordania',     awayTeam: 'Argentina',   scheduledAt: new Date('2026-06-28T02:00:00Z'), groupName: 'J' },
  { homeTeam: 'Argelia',      awayTeam: 'Austria',     scheduledAt: new Date('2026-06-28T02:00:00Z'), groupName: 'J' },

  // ── GROUP K: Portugal, DR Congo, Uzbekistan, Colombia ────────────────────
  { homeTeam: 'Portugal',     awayTeam: 'Congo RD',    scheduledAt: new Date('2026-06-17T17:00:00Z'), groupName: 'K' },
  { homeTeam: 'Uzbekistán',   awayTeam: 'Colombia',    scheduledAt: new Date('2026-06-18T02:00:00Z'), groupName: 'K' },
  { homeTeam: 'Portugal',     awayTeam: 'Uzbekistán',  scheduledAt: new Date('2026-06-23T17:00:00Z'), groupName: 'K' },
  { homeTeam: 'Colombia',     awayTeam: 'Congo RD',    scheduledAt: new Date('2026-06-24T02:00:00Z'), groupName: 'K' },
  { homeTeam: 'Colombia',     awayTeam: 'Portugal',    scheduledAt: new Date('2026-06-27T23:30:00Z'), groupName: 'K' },
  { homeTeam: 'Congo RD',     awayTeam: 'Uzbekistán',  scheduledAt: new Date('2026-06-27T23:30:00Z'), groupName: 'K' },

  // ── GROUP L: England, Croatia, Ghana, Panama ─────────────────────────────
  { homeTeam: 'Inglaterra',   awayTeam: 'Croacia',     scheduledAt: new Date('2026-06-17T20:00:00Z'), groupName: 'L' },
  { homeTeam: 'Ghana',        awayTeam: 'Panamá',      scheduledAt: new Date('2026-06-17T23:00:00Z'), groupName: 'L' },
  { homeTeam: 'Inglaterra',   awayTeam: 'Ghana',       scheduledAt: new Date('2026-06-23T20:00:00Z'), groupName: 'L' },
  { homeTeam: 'Panamá',       awayTeam: 'Croacia',     scheduledAt: new Date('2026-06-23T23:00:00Z'), groupName: 'L' },
  { homeTeam: 'Panamá',       awayTeam: 'Inglaterra',  scheduledAt: new Date('2026-06-27T21:00:00Z'), groupName: 'L' },
  { homeTeam: 'Croacia',      awayTeam: 'Ghana',       scheduledAt: new Date('2026-06-27T21:00:00Z'), groupName: 'L' },
];

// ─── knockout slots (teams TBD) ───────────────────────────────────────────────
// R32 (16), R16 (8), QF (4), SF (2), THIRD_PLACE (1), FINAL (1) = 32 slots
// Times from Fox Sports official schedule (ET → UTC)

function slot(stage: MatchStage, order: number, iso: string) {
  return {
    homeTeam: 'TBD', awayTeam: 'TBD',
    scheduledAt: new Date(iso),
    stage, phase: MatchPhase.KNOCKOUT, matchOrder: order,
    status: MatchStatus.SCHEDULED,
    groupName: null, externalId: null, homeScore: null, awayScore: null,
  };
}

const knockoutSlots = [
  // R32 — June 28 - July 3
  slot(MatchStage.R32,  1, '2026-06-28T19:00:00Z'),
  slot(MatchStage.R32,  2, '2026-06-29T17:00:00Z'),
  slot(MatchStage.R32,  3, '2026-06-29T20:30:00Z'),
  slot(MatchStage.R32,  4, '2026-06-30T01:00:00Z'),
  slot(MatchStage.R32,  5, '2026-06-30T17:00:00Z'),
  slot(MatchStage.R32,  6, '2026-06-30T21:00:00Z'),
  slot(MatchStage.R32,  7, '2026-07-01T01:00:00Z'),
  slot(MatchStage.R32,  8, '2026-07-01T16:00:00Z'),
  slot(MatchStage.R32,  9, '2026-07-01T20:00:00Z'),
  slot(MatchStage.R32, 10, '2026-07-02T00:00:00Z'),
  slot(MatchStage.R32, 11, '2026-07-02T19:00:00Z'),
  slot(MatchStage.R32, 12, '2026-07-02T23:00:00Z'),
  slot(MatchStage.R32, 13, '2026-07-03T03:00:00Z'),
  slot(MatchStage.R32, 14, '2026-07-03T18:00:00Z'),
  slot(MatchStage.R32, 15, '2026-07-03T22:00:00Z'),
  slot(MatchStage.R32, 16, '2026-07-04T01:30:00Z'),

  // R16 — July 4-7
  slot(MatchStage.R16, 1, '2026-07-04T17:00:00Z'),
  slot(MatchStage.R16, 2, '2026-07-04T21:00:00Z'),
  slot(MatchStage.R16, 3, '2026-07-05T20:00:00Z'),
  slot(MatchStage.R16, 4, '2026-07-06T00:00:00Z'),
  slot(MatchStage.R16, 5, '2026-07-06T19:00:00Z'),
  slot(MatchStage.R16, 6, '2026-07-07T00:00:00Z'),
  slot(MatchStage.R16, 7, '2026-07-07T16:00:00Z'),
  slot(MatchStage.R16, 8, '2026-07-07T20:00:00Z'),

  // QF — July 9-11
  slot(MatchStage.QF, 1, '2026-07-09T20:00:00Z'),
  slot(MatchStage.QF, 2, '2026-07-10T19:00:00Z'),
  slot(MatchStage.QF, 3, '2026-07-11T21:00:00Z'),
  slot(MatchStage.QF, 4, '2026-07-12T01:00:00Z'),

  // SF — July 14-15
  slot(MatchStage.SF, 1, '2026-07-14T19:00:00Z'),
  slot(MatchStage.SF, 2, '2026-07-15T19:00:00Z'),

  // Third place — July 18
  slot(MatchStage.THIRD_PLACE, 1, '2026-07-18T19:00:00Z'),

  // Final — July 19
  slot(MatchStage.FINAL, 1, '2026-07-19T19:00:00Z'),
];

// ─── main ─────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = 'admin@fwc2026.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists, skipping.');
    return;
  }
  const passwordHash = await bcrypt.hash('Admin2026!', 10);
  await prisma.user.create({
    data: { email, name: 'Admin', passwordHash, role: Role.ADMIN },
  });
  console.log(`Admin created → email: ${email}  password: Admin2026!`);
}

async function main() {
  await seedAdmin();
  console.log('Seeding matches...');

  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();

  for (const m of groupMatches) {
    await prisma.match.create({
      data: {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        scheduledAt: m.scheduledAt,
        stage: MatchStage.GROUP,
        phase: MatchPhase.GROUP_STAGE,
        groupName: m.groupName,
        status: MatchStatus.SCHEDULED,
        homeScore: null, awayScore: null, externalId: null,
      },
    });
  }

  for (const s of knockoutSlots) {
    await prisma.match.create({ data: s });
  }

  const total = await prisma.match.count();
  console.log(`Done. ${total} matches seeded (${groupMatches.length} group + ${knockoutSlots.length} knockout).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
