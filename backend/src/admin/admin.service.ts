import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchStage, MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';

const CONFIG_KEYS = {
  knockoutActivated: 'knockout_activated',
  knockoutReminderSent: 'knockout_reminder_sent',
} as const;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async activateKnockout(): Promise<{ message: string; usersNotified: number }> {
    const alreadyActivated = await this.getConfig(CONFIG_KEYS.knockoutActivated);
    if (alreadyActivated === 'true') {
      throw new BadRequestException('Knockout phase is already activated');
    }

    // Warn if R32 slots still have TBD teams, but don't block (admin controls order)
    const tbdCount = await this.prisma.match.count({
      where: { stage: MatchStage.R32, homeTeam: 'TBD' },
    });
    if (tbdCount > 0) {
      this.logger.warn(`Activating knockout with ${tbdCount} R32 slots still TBD`);
    }

    const firstR32 = await this.prisma.match.findFirst({
      where: { stage: MatchStage.R32, status: MatchStatus.SCHEDULED },
      orderBy: { scheduledAt: 'asc' },
    });
    if (!firstR32) {
      throw new BadRequestException('No scheduled R32 matches found in the database');
    }

    const users = await this.prisma.user.findMany({
      select: { email: true, name: true },
    });

    await this.email.sendKnockoutActivation(users, firstR32.scheduledAt);
    await this.setConfig(CONFIG_KEYS.knockoutActivated, 'true');

    this.logger.log(`Knockout activated — notified ${users.length} users`);
    return { message: 'Knockout phase activated', usersNotified: users.length };
  }

  // Runs daily at 12:00 UTC. Sends a 24h reminder once, the day before the first R32.
  @Cron('0 12 * * *')
  async sendKnockoutReminderIfDue(): Promise<void> {
    const alreadySent = await this.getConfig(CONFIG_KEYS.knockoutReminderSent);
    if (alreadySent === 'true') return;

    const now = new Date();
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const firstR32 = await this.prisma.match.findFirst({
      where: {
        stage: MatchStage.R32,
        status: MatchStatus.SCHEDULED,
        scheduledAt: { lte: in25h },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (!firstR32) return;

    this.logger.log('Sending 24h knockout reminder…');
    const users = await this.prisma.user.findMany({
      select: { email: true, name: true },
    });

    await this.email.sendKnockoutReminder(users, firstR32.scheduledAt);
    await this.setConfig(CONFIG_KEYS.knockoutReminderSent, 'true');
  }

  async sendTestEmail(to: string): Promise<{ message: string }> {
    await this.email.sendTestEmail(to);
    return { message: `Test email sent to ${to}` };
  }

  private async getConfig(key: string): Promise<string | null> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async setConfig(key: string, value: string): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
