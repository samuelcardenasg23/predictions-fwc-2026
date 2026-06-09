import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { MatchStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';
import { CreateMatchesBatchDto } from './dto/create-matches-batch.dto.js';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('matches/batch')
  @HttpCode(HttpStatus.CREATED)
  createMatchesBatch(@Body() dto: CreateMatchesBatchDto) {
    return this.adminService.createMatchesBatch(dto);
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
