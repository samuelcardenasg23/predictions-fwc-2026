import { Module } from '@nestjs/common';
import { FootballApiService } from './football-api.service.js';

@Module({
  providers: [FootballApiService],
  exports: [FootballApiService],
})
export class FootballApiModule {}
