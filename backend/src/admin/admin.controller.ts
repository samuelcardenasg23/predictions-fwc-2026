import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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

  @Post('activate-knockout')
  @HttpCode(HttpStatus.OK)
  activateKnockout() {
    return this.adminService.activateKnockout();
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  testEmail(@Body('to') to: string) {
    return this.adminService.sendTestEmail(to);
  }

  @Post('test-email/knockout-activation')
  @HttpCode(HttpStatus.OK)
  testKnockoutActivation(@Body('to') to: string) {
    return this.adminService.sendTestKnockoutActivation(to);
  }

  @Post('test-email/knockout-reminder')
  @HttpCode(HttpStatus.OK)
  testKnockoutReminder(@Body('to') to: string) {
    return this.adminService.sendTestKnockoutReminder(to);
  }
}
