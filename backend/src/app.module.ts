import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { PredictionsModule } from './predictions/predictions.module.js';
import { SyncModule } from './sync/sync.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    MatchesModule,
    PredictionsModule,
    SyncModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
