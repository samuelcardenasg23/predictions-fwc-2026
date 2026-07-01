import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { MatchStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';
import { CreateMatchesBatchDto } from './dto/create-matches-batch.dto.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { UpdateMatchTeamsDto } from './dto/update-match-teams.dto.js';
import { SetLeadTimeDto } from './dto/set-lead-time.dto.js';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('matches/batch')
  @HttpCode(HttpStatus.CREATED)
  createMatchesBatch(@Body() dto: CreateMatchesBatchDto) {
    return this.adminService.createMatchesBatch(dto);
  }

  @Post('matches')
  @HttpCode(HttpStatus.CREATED)
  createMatch(@Body() dto: CreateMatchDto) {
    return this.adminService.createMatch(dto);
  }

  @Patch('matches/:id')
  @HttpCode(HttpStatus.OK)
  updateMatchTeams(@Param('id') id: string, @Body() dto: UpdateMatchTeamsDto) {
    return this.adminService.updateMatchTeams(id, dto);
  }

  @Delete('matches/:id')
  @HttpCode(HttpStatus.OK)
  deleteMatch(@Param('id') id: string) {
    return this.adminService.deleteMatch(id);
  }

  @Post('stages/:stage/activate')
  @HttpCode(HttpStatus.OK)
  activateStage(@Param('stage') stage: string) {
    return this.adminService.activateStage(stage.toUpperCase() as MatchStage);
  }

  @Get('stages/status')
  getStagesStatus() {
    return this.adminService.getStagesStatus();
  }

  @Get('config/prediction-lead-time')
  getPredictionLeadTime() {
    return this.adminService.getPredictionLeadTime();
  }

  @Put('config/prediction-lead-time')
  @HttpCode(HttpStatus.OK)
  setPredictionLeadTime(@Body() dto: SetLeadTimeDto) {
    return this.adminService.setPredictionLeadTime(dto.minutes);
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  testEmail(@Body('to') to: string) {
    return this.adminService.sendTestEmail(to);
  }

  @Post('test-email/stage-activation')
  @HttpCode(HttpStatus.OK)
  testStageActivation(@Body('to') to: string, @Body('stage') stage: string) {
    return this.adminService.sendTestStageActivation(to, (stage ?? 'R32').toUpperCase() as MatchStage);
  }

  @Post('test-email/stage-reminder')
  @HttpCode(HttpStatus.OK)
  testStageReminder(@Body('to') to: string, @Body('stage') stage: string) {
    return this.adminService.sendTestStageReminder(to, (stage ?? 'R32').toUpperCase() as MatchStage);
  }
}
