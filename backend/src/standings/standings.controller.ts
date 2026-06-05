import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StandingsService } from './standings.service.js';

@UseGuards(JwtAuthGuard)
@Controller('standings')
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get('groups')
  getGroups() {
    return this.standingsService.getGroupStandings();
  }
}
