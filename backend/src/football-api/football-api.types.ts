export interface FDTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export interface FDResponse {
  matches: FDMatch[];
}

export interface FDStandingEntry {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FDStandingGroup {
  stage: string;
  type: string;
  group: string;
  table: FDStandingEntry[];
}

export interface FDStandingsResponse {
  standings: Array<FDStandingGroup & { group: string | null }>;
}

// football-data.org status values
export const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
export const FINISHED_STATUSES = new Set(['FINISHED']);
