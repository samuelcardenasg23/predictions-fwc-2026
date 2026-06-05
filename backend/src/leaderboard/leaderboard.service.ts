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
    // Include ALL predictions — we'll compute points only for played matches
    // so every user with at least one prediction appears in the table from day 1
    const predictions = await this.prisma.prediction.findMany({
      include: {
        match: {
          select: {
            homeScore: true,
            awayScore: true,
            stage: true,
            status: true,
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    const statsMap = new Map<
      string,
      { name: string; totalPoints: number; exact: number; outcome: number; total: number }
    >();

    for (const pred of predictions) {
      const { match, user } = pred;

      if (!statsMap.has(user.id)) {
        statsMap.set(user.id, {
          name: user.name,
          totalPoints: 0,
          exact: 0,
          outcome: 0,
          total: 0,
        });
      }

      const entry = statsMap.get(user.id)!;
      entry.total += 1;

      // Only score predictions for matches that have been played
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

    // Sort by totalPoints desc, then by total predictions desc (more active players rank higher on tie)
    const sorted = [...statsMap.entries()]
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

    return sorted;
  }
}
