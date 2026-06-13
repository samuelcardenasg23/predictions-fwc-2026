import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller.js';
import { LeaderboardService } from './leaderboard.service.js';
import { PredictionsModule } from '../predictions/predictions.module.js';

@Module({
  imports: [PredictionsModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
