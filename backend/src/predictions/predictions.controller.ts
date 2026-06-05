import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PredictionsService } from './predictions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UpsertPredictionDto } from './dto/upsert-prediction.dto.js';
import { BulkPredictionsDto } from './dto/bulk-predictions.dto.js';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post('bulk')
  bulkUpsert(@Req() req: AuthenticatedRequest, @Body() dto: BulkPredictionsDto) {
    return this.predictionsService.bulkUpsert(req.user.id, dto);
  }

  @Post('lock-group-stage')
  lockGroupStage(@Req() req: AuthenticatedRequest) {
    return this.predictionsService.lockGroupStage(req.user.id);
  }

  @Delete('me')
  deleteAll(@Req() req: AuthenticatedRequest) {
    return this.predictionsService.deleteAll(req.user.id);
  }

  @Put(':matchId')
  upsert(
    @Req() req: AuthenticatedRequest,
    @Param('matchId') matchId: string,
    @Body() dto: UpsertPredictionDto,
  ) {
    return this.predictionsService.upsert(req.user.id, matchId, dto);
  }

  @Get('me')
  getMyPredictions(@Req() req: AuthenticatedRequest) {
    return this.predictionsService.findByUser(req.user.id);
  }

  @Get('user/:userId')
  getUserPredictions(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.predictionsService.findByUserId(req.user.id, userId);
  }
}
