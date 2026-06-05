import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('activate-knockout')
  @HttpCode(HttpStatus.OK)
  activateKnockout() {
    return this.adminService.activateKnockout();
  }
}
