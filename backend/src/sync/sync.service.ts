import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { FootballApiService } from '../football-api/football-api.service.js';
import { ApiFixture, FINISHED_STATUSES, LIVE_STATUSES } from '../football-api/football-api.types.js';

// A match can be live up to 130 min after its scheduled start (90 + HT + ET buffer)
const LIVE_WINDOW_MS = 130 * 60 * 1000;
// Start polling 10 min before scheduled kickoff
const PRE_MATCH_BUFFER_MS = 10 * 60 * 1000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly footballApi: FootballApiService,
  ) {}

  @Cron('*/2 * * * *')
  async syncLiveMatches() {
    const now = new Date();

    const todayMatches = await this.getTodayMatches(now);
    if (todayMatches.length === 0) return;

    const hasLiveInDb = todayMatches.some((m) => m.status === MatchStatus.LIVE);
    const mightBeActive = todayMatches.some((m) => this.isWithinActiveWindow(m.scheduledAt, now));

    if (!hasLiveInDb && !mightBeActive) return;

    this.logger.debug('Polling API-Football for live WC fixtures…');
    const liveFixtures = await this.footballApi.getLiveFixtures();

    for (const fixture of liveFixtures) {
      await this.syncFixture(fixture, MatchStatus.LIVE);
    }

    // If API reports no live matches but DB still has LIVE rows → matches just finished
    if (liveFixtures.length === 0 && hasLiveInDb) {
      this.logger.debug('No live fixtures from API; fetching today\'s results…');
      const todayFixtures = await this.footballApi.getFixturesByDate(now);
      for (const fixture of todayFixtures) {
        if (FINISHED_STATUSES.has(fixture.fixture.status.short)) {
          await this.syncFixture(fixture, MatchStatus.FINISHED);
        }
      }
    }
  }

  private async getTodayMatches(now: Date) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setUTCHours(23, 59, 59, 999);

    return this.prisma.match.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      select: { id: true, scheduledAt: true, status: true, externalId: true },
    });
  }

  private isWithinActiveWindow(scheduledAt: Date, now: Date): boolean {
    const t = scheduledAt.getTime();
    return t >= now.getTime() - LIVE_WINDOW_MS && t <= now.getTime() + PRE_MATCH_BUFFER_MS;
  }

  private async syncFixture(fixture: ApiFixture, newStatus: MatchStatus) {
    const match = await this.resolveMatch(fixture);
    if (!match) return;

    // Use fulltime score as the canonical result.
    // If match is still live, use goals (current score); fulltime will be null until FT.
    const homeScore =
      newStatus === MatchStatus.LIVE
        ? (fixture.goals.home ?? null)
        : (fixture.score.fulltime.home ?? fixture.goals.home ?? null);
    const awayScore =
      newStatus === MatchStatus.LIVE
        ? (fixture.goals.away ?? null)
        : (fixture.score.fulltime.away ?? fixture.goals.away ?? null);

    await this.prisma.match.update({
      where: { id: match.id },
      data: {
        status: newStatus,
        homeScore,
        awayScore,
        // Persist externalId on first match so future lookups are O(1)
        ...(match.externalId === null ? { externalId: fixture.fixture.id } : {}),
      },
    });

    this.logger.debug(
      `Synced match ${match.id} → status=${newStatus} score=${homeScore}-${awayScore}`,
    );
  }

  private async resolveMatch(fixture: ApiFixture) {
    // Fast path: already linked by externalId
    if (fixture.fixture.id) {
      const byExternal = await this.prisma.match.findUnique({
        where: { externalId: fixture.fixture.id },
      });
      if (byExternal) return byExternal;
    }

    // Slow path: match by scheduled time proximity (±30 min)
    const apiTime = new Date(fixture.fixture.date);
    const windowMs = 30 * 60 * 1000;
    const match = await this.prisma.match.findFirst({
      where: {
        scheduledAt: {
          gte: new Date(apiTime.getTime() - windowMs),
          lte: new Date(apiTime.getTime() + windowMs),
        },
        externalId: null,
      },
    });

    if (!match) {
      this.logger.warn(
        `No DB match found for API fixture ${fixture.fixture.id} (${fixture.fixture.date})`,
      );
    }

    return match;
  }
}
