import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware.js';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { PredictionsModule } from './predictions/predictions.module.js';
import { SyncModule } from './sync/sync.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { AdminModule } from './admin/admin.module.js';
import { StandingsModule } from './standings/standings.module.js';

@Module({
  controllers: [AppController],
  providers: [AppService],
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
    AdminModule,
    StandingsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*path');
  }
}
