import { Injectable } from '@nestjs/common';
import { MatchPhase, MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { calculatePoints } from '../scoring/scoring.util.js';
import { GroupStagePoolService } from '../predictions/group-stage-pool.service.js';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  exactPredictions: number;
  outcomePredictions: number;
  totalPredictions: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pool: GroupStagePoolService,
  ) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const now = new Date();
    const deadline = await this.pool.getGlobalDeadline();
    const predictions = await this.prisma.prediction.findMany({
      include: {
        match: {
          select: {
            homeScore: true,
            awayScore: true,
            stage: true,
            status: true,
            phase: true,
            scheduledAt: true,
            excludedFromPool: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            groupStageLockedAt: true,
            groupStageEntryAt: true,
          },
        },
      },
    });

    const statsMap = new Map<
      string,
      { name: string; totalPoints: number; exact: number; outcome: number; total: number }
    >();

    for (const pred of predictions) {
      const { match, user } = pred;

      if (!statsMap.has(user.id)) {
        statsMap.set(user.id, { name: user.name, totalPoints: 0, exact: 0, outcome: 0, total: 0 });
      }

      const entry = statsMap.get(user.id)!;

      // Group stage: per-user pool decides what scores (legacy vs late entrant).
      // Knockout: excluded matches simply don't count.
      if (match.phase === MatchPhase.GROUP_STAGE) {
        if (!this.pool.countsForScoring(user, match, true, deadline, now)) continue;
      } else if (match.excludedFromPool) {
        continue;
      }

      entry.total += 1;

      const isPlayed =
        (match.status === MatchStatus.LIVE || match.status === MatchStatus.FINISHED) &&
        match.homeScore !== null &&
        match.awayScore !== null;

      if (!isPlayed) continue;

      const pts = calculatePoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        { homeScore: match.homeScore!, awayScore: match.awayScore!, stage: match.stage },
      );

      const isExact =
        pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;

      entry.totalPoints += pts;
      if (isExact) entry.exact += 1;
      else if (pts > 0) entry.outcome += 1;
    }

    return [...statsMap.entries()]
      .sort((a, b) =>
        b[1].totalPoints !== a[1].totalPoints
          ? b[1].totalPoints - a[1].totalPoints
          : b[1].total - a[1].total,
      )
      .map(([userId, s], index) => ({
        rank: index + 1,
        userId,
        name: s.name,
        totalPoints: s.totalPoints,
        exactPredictions: s.exact,
        outcomePredictions: s.outcome,
        totalPredictions: s.total,
      }));
  }
}
