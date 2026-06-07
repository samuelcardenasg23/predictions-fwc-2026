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

const TEAM_BONUS_STAGES = new Set<MatchStage>(['R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL']);

export function calculateTeamBonus(
  prediction: { homeTeamPick?: string | null; awayTeamPick?: string | null },
  match: { homeTeam: string; awayTeam: string; stage: MatchStage },
): number {
  if (!TEAM_BONUS_STAGES.has(match.stage)) return 0;
  let bonus = 0;
  if (prediction.homeTeamPick && prediction.homeTeamPick === match.homeTeam) bonus += 1;
  if (prediction.awayTeamPick && prediction.awayTeamPick === match.awayTeam) bonus += 1;
  return bonus;
}
