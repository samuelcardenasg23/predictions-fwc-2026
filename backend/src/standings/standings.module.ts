import { Module } from '@nestjs/common';
import { FootballApiModule } from '../football-api/football-api.module.js';
import { StandingsController } from './standings.controller.js';
import { StandingsService } from './standings.service.js';

@Module({
  imports: [FootballApiModule],
  controllers: [StandingsController],
  providers: [StandingsService],
})
export class StandingsModule {}
