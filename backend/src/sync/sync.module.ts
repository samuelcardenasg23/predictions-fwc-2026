import { Module } from '@nestjs/common';
import { FootballApiModule } from '../football-api/football-api.module.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [FootballApiModule],
  providers: [SyncService],
})
export class SyncModule {}
