import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { FootballApiService } from '../football-api/football-api.service.js';
import { FDMatch, FINISHED_STATUSES, LIVE_STATUSES } from '../football-api/football-api.types.js';

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

    this.logger.debug('Polling football-data.org for live WC matches…');
    const liveMatches = await this.footballApi.getLiveMatches();

    for (const match of liveMatches) {
      await this.syncMatch(match, MatchStatus.LIVE);
    }

    // If API reports no live matches but DB still has LIVE rows → matches just finished
    if (liveMatches.length === 0 && hasLiveInDb) {
      this.logger.debug('No live matches from API; fetching today\'s results…');
      const todayApiMatches = await this.footballApi.getMatchesByDate(now);
      for (const match of todayApiMatches) {
        if (FINISHED_STATUSES.has(match.status)) {
          await this.syncMatch(match, MatchStatus.FINISHED);
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

  private async syncMatch(fdMatch: FDMatch, newStatus: MatchStatus) {
    const match = await this.resolveMatch(fdMatch);
    if (!match) return;

    // football-data.org uses score.fullTime for both live (current) and final scores
    const homeScore = fdMatch.score.fullTime.home ?? null;
    const awayScore = fdMatch.score.fullTime.away ?? null;

    await this.prisma.match.update({
      where: { id: match.id },
      data: {
        status: newStatus,
        homeScore,
        awayScore,
        ...(match.externalId === null ? { externalId: fdMatch.id } : {}),
      },
    });

    this.logger.debug(
      `Synced match ${match.id} → status=${newStatus} score=${homeScore}-${awayScore}`,
    );
  }

  private async resolveMatch(fdMatch: FDMatch) {
    // Fast path: already linked by externalId
    const byExternal = await this.prisma.match.findUnique({
      where: { externalId: fdMatch.id },
    });
    if (byExternal) return byExternal;

    // Slow path: match by scheduled time proximity (±30 min)
    const apiTime = new Date(fdMatch.utcDate);
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
        `No DB match found for API match ${fdMatch.id} (${fdMatch.utcDate})`,
      );
    }

    return match;
  }
}
