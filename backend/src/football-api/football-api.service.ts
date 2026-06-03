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
    const dateStr = date.toISOString().slice(0, 10);
    return this.get(`/fixtures?league=${WC_LEAGUE_ID}&date=${dateStr}`);
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
      if (body.results === 0) return [];
      return body.response;
    } catch (err) {
      this.logger.error(`API-Football request failed: ${path}`, err);
      return [];
    }
  }
}
