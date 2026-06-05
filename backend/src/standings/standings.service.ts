import { Injectable } from '@nestjs/common';
import { FootballApiService } from '../football-api/football-api.service.js';

@Injectable()
export class StandingsService {
  constructor(private readonly footballApi: FootballApiService) {}

  getGroupStandings() {
    return this.footballApi.getGroupStandings();
  }
}
