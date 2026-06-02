import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { PredictionsController } from './predictions.controller.js';

@Module({
  providers: [PredictionsService],
  controllers: [PredictionsController],
})
export class PredictionsModule {}
