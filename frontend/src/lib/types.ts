export type Role = 'USER' | 'ADMIN';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';
export type MatchStage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD_PLACE' | 'FINAL';
export type MatchPhase = 'GROUP_STAGE' | 'KNOCKOUT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  groupStageLockedAt: string | null;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: MatchStage;
  phase: MatchPhase;
  groupName: string | null;
  matchOrder: number | null;
  homeTeamOpts: string | null;
  awayTeamOpts: string | null;
}

export interface Prediction {
  id: string;
  matchId: string;
  userId: string;
  homeScore: number;
  awayScore: number;
  homeTeamPick: string | null;
  awayTeamPick: string | null;
  match?: Match;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  exactPredictions: number;
  outcomePredictions: number;
  teamBonusPredictions: number;
  totalPredictions: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
