import { Injectable } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { calculatePoints } from '../scoring/scoring.util.js';

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
  constructor(private readonly prisma: PrismaService) {}

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const predictions = await this.prisma.prediction.findMany({
      where: {
        match: { status: { in: [MatchStatus.LIVE, MatchStatus.FINISHED] } },
      },
      include: {
        match: { select: { homeScore: true, awayScore: true, stage: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    });

    const statsMap = new Map<
      string,
      { name: string; totalPoints: number; exact: number; outcome: number; total: number }
    >();

    for (const pred of predictions) {
      const { match, user } = pred;
      if (match.homeScore === null || match.awayScore === null) continue;

      const pts = calculatePoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        { homeScore: match.homeScore, awayScore: match.awayScore, stage: match.stage },
      );

      const entry = statsMap.get(user.id) ?? {
        name: user.name,
        totalPoints: 0,
        exact: 0,
        outcome: 0,
        total: 0,
      };

      const isExact =
        pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
      const isOutcome = !isExact && pts > 0;

      entry.totalPoints += pts;
      entry.total += 1;
      if (isExact) entry.exact += 1;
      if (isOutcome) entry.outcome += 1;

      statsMap.set(user.id, entry);
    }

    const sorted = [...statsMap.entries()]
      .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
      .map(([userId, s], index) => ({
        rank: index + 1,
        userId,
        name: s.name,
        totalPoints: s.totalPoints,
        exactPredictions: s.exact,
        outcomePredictions: s.outcome,
        totalPredictions: s.total,
      }));

    return sorted;
  }
}
