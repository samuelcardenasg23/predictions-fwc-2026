import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FDMatch, FDResponse, FDStandingGroup, FDStandingsResponse } from './football-api.types.js';

const BASE_URL = 'https://api.football-data.org/v4';

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);
  private readonly headers: Record<string, string>;
  private standingsCache: { data: FDStandingGroup[]; expiresAt: number } | null = null;

  constructor(private config: ConfigService) {
    this.headers = {
      'X-Auth-Token': this.config.getOrThrow('FOOTBALL_DATA_KEY'),
    };
  }

  async getLiveMatches(): Promise<FDMatch[]> {
    // IN_PLAY = 1st/2nd half active; PAUSED = half-time break
    const [inPlay, paused] = await Promise.all([
      this.get('/competitions/WC/matches?status=IN_PLAY'),
      this.get('/competitions/WC/matches?status=PAUSED'),
    ]);
    return [...inPlay, ...paused];
  }

  async getMatchesByDate(date: Date): Promise<FDMatch[]> {
    const dateStr = date.toISOString().slice(0, 10);
    return this.get(`/competitions/WC/matches?dateFrom=${dateStr}&dateTo=${dateStr}`);
  }

  async getGroupStandings(): Promise<FDStandingGroup[]> {
    const now = Date.now();
    if (this.standingsCache && this.standingsCache.expiresAt > now) {
      return this.standingsCache.data;
    }

    const url = `${BASE_URL}/competitions/WC/standings`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        this.logger.warn(`football-data.org standings responded ${res.status}`);
        return this.standingsCache?.data ?? [];
      }
      const body = (await res.json()) as FDStandingsResponse;
      const groups = (body.standings ?? [])
        .filter((s): s is FDStandingGroup => s.group !== null)
        .sort((a, b) => a.group.localeCompare(b.group));
      this.standingsCache = { data: groups, expiresAt: now + 5 * 60 * 1000 };
      return groups;
    } catch (err) {
      this.logger.error('football-data.org standings request failed', err);
      return this.standingsCache?.data ?? [];
    }
  }

  private async get(path: string): Promise<FDMatch[]> {
    const url = `${BASE_URL}${path}`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        this.logger.warn(`football-data.org responded ${res.status} for ${path}`);
        return [];
      }
      const body = (await res.json()) as FDResponse;
      return body.matches ?? [];
    } catch (err) {
      this.logger.error(`football-data.org request failed: ${path}`, err);
      return [];
    }
  }
}
