import { PrismaClient, MatchStage, MatchPhase, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function d(iso: string) {
  return new Date(iso);
}

// ─── group stage matches ─────────────────────────────────────────────────────
// FWC 2026: 16 groups of 3 teams — 3 matches each = 48 total
// Dates are approximate; verify against official schedule before seeding prod.

const groupMatches = [
  // ── Group A ───────────────────────────────────────────────────────────────
  { homeTeam: 'USA',       awayTeam: 'Morocco',     scheduledAt: d('2026-06-11T23:00:00Z'), groupName: 'A' },
  { homeTeam: 'South Korea', awayTeam: 'USA',        scheduledAt: d('2026-06-19T23:00:00Z'), groupName: 'A' },
  { homeTeam: 'Morocco',   awayTeam: 'South Korea',  scheduledAt: d('2026-06-25T23:00:00Z'), groupName: 'A' },

  // ── Group B ───────────────────────────────────────────────────────────────
  { homeTeam: 'Mexico',    awayTeam: 'Poland',       scheduledAt: d('2026-06-12T01:00:00Z'), groupName: 'B' },
  { homeTeam: 'Australia', awayTeam: 'Mexico',       scheduledAt: d('2026-06-20T01:00:00Z'), groupName: 'B' },
  { homeTeam: 'Poland',    awayTeam: 'Australia',    scheduledAt: d('2026-06-26T01:00:00Z'), groupName: 'B' },

  // ── Group C ───────────────────────────────────────────────────────────────
  { homeTeam: 'Canada',    awayTeam: 'Senegal',      scheduledAt: d('2026-06-12T17:00:00Z'), groupName: 'C' },
  { homeTeam: 'Iran',      awayTeam: 'Canada',       scheduledAt: d('2026-06-20T17:00:00Z'), groupName: 'C' },
  { homeTeam: 'Senegal',   awayTeam: 'Iran',         scheduledAt: d('2026-06-26T17:00:00Z'), groupName: 'C' },

  // ── Group D ───────────────────────────────────────────────────────────────
  { homeTeam: 'Argentina', awayTeam: 'Serbia',       scheduledAt: d('2026-06-13T01:00:00Z'), groupName: 'D' },
  { homeTeam: 'Nigeria',   awayTeam: 'Argentina',    scheduledAt: d('2026-06-21T01:00:00Z'), groupName: 'D' },
  { homeTeam: 'Serbia',    awayTeam: 'Nigeria',      scheduledAt: d('2026-06-25T01:00:00Z'), groupName: 'D' },

  // ── Group E ───────────────────────────────────────────────────────────────
  { homeTeam: 'France',    awayTeam: 'Saudi Arabia', scheduledAt: d('2026-06-13T17:00:00Z'), groupName: 'E' },
  { homeTeam: 'Honduras',  awayTeam: 'France',       scheduledAt: d('2026-06-21T17:00:00Z'), groupName: 'E' },
  { homeTeam: 'Saudi Arabia', awayTeam: 'Honduras',  scheduledAt: d('2026-06-25T17:00:00Z'), groupName: 'E' },

  // ── Group F ───────────────────────────────────────────────────────────────
  { homeTeam: 'Brazil',    awayTeam: 'Ivory Coast',  scheduledAt: d('2026-06-14T01:00:00Z'), groupName: 'F' },
  { homeTeam: 'Scotland',  awayTeam: 'Brazil',       scheduledAt: d('2026-06-22T01:00:00Z'), groupName: 'F' },
  { homeTeam: 'Ivory Coast', awayTeam: 'Scotland',   scheduledAt: d('2026-06-26T01:00:00Z'), groupName: 'F' },

  // ── Group G ───────────────────────────────────────────────────────────────
  { homeTeam: 'England',   awayTeam: 'Algeria',      scheduledAt: d('2026-06-14T17:00:00Z'), groupName: 'G' },
  { homeTeam: 'Ecuador',   awayTeam: 'England',      scheduledAt: d('2026-06-22T17:00:00Z'), groupName: 'G' },
  { homeTeam: 'Algeria',   awayTeam: 'Ecuador',      scheduledAt: d('2026-06-26T17:00:00Z'), groupName: 'G' },

  // ── Group H ───────────────────────────────────────────────────────────────
  { homeTeam: 'Portugal',  awayTeam: 'Cameroon',     scheduledAt: d('2026-06-15T01:00:00Z'), groupName: 'H' },
  { homeTeam: 'Uruguay',   awayTeam: 'Portugal',     scheduledAt: d('2026-06-23T01:00:00Z'), groupName: 'H' },
  { homeTeam: 'Cameroon',  awayTeam: 'Uruguay',      scheduledAt: d('2026-06-27T01:00:00Z'), groupName: 'H' },

  // ── Group I ───────────────────────────────────────────────────────────────
  { homeTeam: 'Spain',     awayTeam: 'Japan',        scheduledAt: d('2026-06-15T17:00:00Z'), groupName: 'I' },
  { homeTeam: 'Costa Rica', awayTeam: 'Spain',       scheduledAt: d('2026-06-23T17:00:00Z'), groupName: 'I' },
  { homeTeam: 'Japan',     awayTeam: 'Costa Rica',   scheduledAt: d('2026-06-27T17:00:00Z'), groupName: 'I' },

  // ── Group J ───────────────────────────────────────────────────────────────
  { homeTeam: 'Netherlands', awayTeam: 'Tunisia',    scheduledAt: d('2026-06-16T01:00:00Z'), groupName: 'J' },
  { homeTeam: 'Colombia',  awayTeam: 'Netherlands',  scheduledAt: d('2026-06-24T01:00:00Z'), groupName: 'J' },
  { homeTeam: 'Tunisia',   awayTeam: 'Colombia',     scheduledAt: d('2026-06-28T01:00:00Z'), groupName: 'J' },

  // ── Group K ───────────────────────────────────────────────────────────────
  { homeTeam: 'Germany',   awayTeam: 'Egypt',        scheduledAt: d('2026-06-16T17:00:00Z'), groupName: 'K' },
  { homeTeam: 'Panama',    awayTeam: 'Germany',      scheduledAt: d('2026-06-24T17:00:00Z'), groupName: 'K' },
  { homeTeam: 'Egypt',     awayTeam: 'Panama',       scheduledAt: d('2026-06-28T17:00:00Z'), groupName: 'K' },

  // ── Group L ───────────────────────────────────────────────────────────────
  { homeTeam: 'Belgium',   awayTeam: 'Jordan',       scheduledAt: d('2026-06-17T01:00:00Z'), groupName: 'L' },
  { homeTeam: 'Bolivia',   awayTeam: 'Belgium',      scheduledAt: d('2026-06-24T23:00:00Z'), groupName: 'L' },
  { homeTeam: 'Jordan',    awayTeam: 'Bolivia',      scheduledAt: d('2026-06-28T23:00:00Z'), groupName: 'L' },

  // ── Group M ───────────────────────────────────────────────────────────────
  { homeTeam: 'Croatia',   awayTeam: 'Uzbekistan',   scheduledAt: d('2026-06-17T17:00:00Z'), groupName: 'M' },
  { homeTeam: 'South Africa', awayTeam: 'Croatia',   scheduledAt: d('2026-06-25T23:00:00Z'), groupName: 'M' },
  { homeTeam: 'Uzbekistan', awayTeam: 'South Africa',scheduledAt: d('2026-06-29T01:00:00Z'), groupName: 'M' },

  // ── Group N ───────────────────────────────────────────────────────────────
  { homeTeam: 'Switzerland', awayTeam: 'Iraq',       scheduledAt: d('2026-06-18T01:00:00Z'), groupName: 'N' },
  { homeTeam: 'New Zealand', awayTeam: 'Switzerland',scheduledAt: d('2026-06-26T23:00:00Z'), groupName: 'N' },
  { homeTeam: 'Iraq',      awayTeam: 'New Zealand',  scheduledAt: d('2026-06-29T17:00:00Z'), groupName: 'N' },

  // ── Group O ───────────────────────────────────────────────────────────────
  { homeTeam: 'Denmark',   awayTeam: 'Austria',      scheduledAt: d('2026-06-18T17:00:00Z'), groupName: 'O' },
  { homeTeam: 'Slovakia',  awayTeam: 'Denmark',      scheduledAt: d('2026-06-27T23:00:00Z'), groupName: 'O' },
  { homeTeam: 'Austria',   awayTeam: 'Slovakia',     scheduledAt: d('2026-06-30T01:00:00Z'), groupName: 'O' },

  // ── Group P ───────────────────────────────────────────────────────────────
  { homeTeam: 'Turkey',    awayTeam: 'Paraguay',     scheduledAt: d('2026-06-19T01:00:00Z'), groupName: 'P' },
  { homeTeam: 'Venezuela', awayTeam: 'Turkey',       scheduledAt: d('2026-06-28T03:00:00Z'), groupName: 'P' },
  { homeTeam: 'Paraguay',  awayTeam: 'Venezuela',    scheduledAt: d('2026-06-30T17:00:00Z'), groupName: 'P' },
];

// ─── knockout slots ──────────────────────────────────────────────────────────
// Teams are TBD until groups conclude. matchOrder is used for bracket display.

function knockoutSlot(stage: MatchStage, order: number, scheduledAt: Date) {
  return {
    homeTeam: 'TBD',
    awayTeam: 'TBD',
    scheduledAt,
    stage,
    phase: MatchPhase.KNOCKOUT,
    matchOrder: order,
    status: MatchStatus.SCHEDULED,
    groupName: null,
    externalId: null,
    homeScore: null,
    awayScore: null,
  };
}

const knockoutSlots = [
  // R32 — 16 matches (July 2-9)
  ...Array.from({ length: 16 }, (_, i) =>
    knockoutSlot(MatchStage.R32, i + 1, d(`2026-07-0${2 + Math.floor(i / 2)}T${i % 2 === 0 ? '17' : '21'}:00:00Z`)),
  ),
  // R16 — 8 matches (July 11-14)
  ...Array.from({ length: 8 }, (_, i) =>
    knockoutSlot(MatchStage.R16, i + 1, d(`2026-07-${11 + Math.floor(i / 2)}T${i % 2 === 0 ? '17' : '21'}:00:00Z`)),
  ),
  // QF — 4 matches (July 17-18)
  ...Array.from({ length: 4 }, (_, i) =>
    knockoutSlot(MatchStage.QF, i + 1, d(`2026-07-${17 + Math.floor(i / 2)}T${i % 2 === 0 ? '17' : '21'}:00:00Z`)),
  ),
  // SF — 2 matches (July 21-22)
  knockoutSlot(MatchStage.SF, 1, d('2026-07-21T21:00:00Z')),
  knockoutSlot(MatchStage.SF, 2, d('2026-07-22T21:00:00Z')),
  // Final — 1 match (July 26)
  knockoutSlot(MatchStage.FINAL, 1, d('2026-07-26T21:00:00Z')),
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding matches...');

  await prisma.match.deleteMany();

  // Group stage
  for (const match of groupMatches) {
    await prisma.match.create({
      data: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        scheduledAt: match.scheduledAt,
        stage: MatchStage.GROUP,
        phase: MatchPhase.GROUP_STAGE,
        groupName: match.groupName,
        status: MatchStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
        externalId: null,
      },
    });
  }

  // Knockout slots
  for (const slot of knockoutSlots) {
    await prisma.match.create({ data: slot });
  }

  const total = await prisma.match.count();
  console.log(`Done. ${total} matches seeded (48 group + ${total - 48} knockout).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
