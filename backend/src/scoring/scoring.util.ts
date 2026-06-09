import { MatchStage } from '@prisma/client';

type Outcome = 'H' | 'D' | 'A';

const POINTS: Record<MatchStage, { exact: number; outcome: number }> = {
  GROUP: { exact: 3, outcome: 1 },
  R32: { exact: 3, outcome: 1 },
  R16: { exact: 6, outcome: 2 },
  QF: { exact: 9, outcome: 3 },
  SF: { exact: 12, outcome: 4 },
  THIRD_PLACE: { exact: 12, outcome: 4 },
  FINAL: { exact: 15, outcome: 5 },
};

function outcome(home: number, away: number): Outcome {
  if (home > away) return 'H';
  if (home < away) return 'A';
  return 'D';
}

export function calculatePoints(
  prediction: { homeScore: number; awayScore: number },
  match: { homeScore: number; awayScore: number; stage: MatchStage },
): number {
  const pts = POINTS[match.stage];
  const isExact =
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore;

  if (isExact) return pts.exact;

  const sameOutcome =
    outcome(prediction.homeScore, prediction.awayScore) ===
    outcome(match.homeScore, match.awayScore);

  return sameOutcome ? pts.outcome : 0;
}

