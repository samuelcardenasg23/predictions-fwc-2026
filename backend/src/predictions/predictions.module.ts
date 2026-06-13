import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { PredictionsController } from './predictions.controller.js';
import { GroupStagePoolService } from './group-stage-pool.service.js';

@Module({
  providers: [PredictionsService, GroupStagePoolService],
  controllers: [PredictionsController],
  exports: [GroupStagePoolService],
})
export class PredictionsModule {}
