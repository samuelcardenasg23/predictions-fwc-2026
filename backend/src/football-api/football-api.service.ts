import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiFixture, ApiResponse } from './football-api.types.js';

const WC_LEAGUE_ID = 1;

@Injectable()
export class FootballApiService {
  private readonly logger = new Logger(FootballApiService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.getOrThrow('API_FOOTBALL_BASE_URL');
    this.headers = {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': this.config.getOrThrow('API_FOOTBALL_KEY'),
    };
  }

  async getLiveFixtures(): Promise<ApiFixture[]> {
    return this.get(`/fixtures?live=all&league=${WC_LEAGUE_ID}`);
  }

  async getFixturesByDate(date: Date): Promise<ApiFixture[]> {
    // ?league= requires season=, but season=2026 is blocked on the free tier.
    // Querying by date alone works within the rolling access window (~3 days),
    // so we fetch all fixtures for the day and filter by league in code.
    const dateStr = date.toISOString().slice(0, 10);
    const all = await this.get(`/fixtures?date=${dateStr}`);
    return all.filter((f) => f.league.id === WC_LEAGUE_ID);
  }

  private async get<T = ApiFixture>(path: string): Promise<T[]> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        this.logger.warn(`API-Football responded ${res.status} for ${path}`);
        return [];
      }
      const body = (await res.json()) as ApiResponse<T>;
      if (Object.keys(body.errors ?? {}).length > 0) {
        this.logger.warn(`API-Football error for ${path}: ${JSON.stringify(body.errors)}`);
        return [];
      }
      return body.response ?? [];
    } catch (err) {
      this.logger.error(`API-Football request failed: ${path}`, err);
      return [];
    }
  }
}
