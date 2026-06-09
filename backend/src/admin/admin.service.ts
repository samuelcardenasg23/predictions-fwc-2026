import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchStage, MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { CreateMatchesBatchDto } from './dto/create-matches-batch.dto.js';
import { CreateMatchDto } from './dto/create-match.dto.js';

const KNOCKOUT_STAGES: MatchStage[] = ['R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL'];

function stageOpenKey(stage: MatchStage) {
  return `knockout_${stage.toLowerCase()}_open`;
}

function stageReminderKey(stage: MatchStage) {
  return `knockout_${stage.toLowerCase()}_reminder_sent`;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async activateStage(stage: MatchStage): Promise<{ message: string; usersNotified: number }> {
    if (!KNOCKOUT_STAGES.includes(stage)) {
      throw new BadRequestException(`Invalid knockout stage: ${stage}`);
    }

    const alreadyOpen = await this.getConfig(stageOpenKey(stage));
    if (alreadyOpen === 'true') {
      throw new BadRequestException(`Stage ${stage} is already activated`);
    }

    const firstMatch = await this.prisma.match.findFirst({
      where: { stage, status: MatchStatus.SCHEDULED },
      orderBy: { scheduledAt: 'asc' },
    });
    if (!firstMatch) {
      throw new BadRequestException(
        `No scheduled matches found for stage ${stage}. Create them first via POST /admin/matches/batch.`,
      );
    }

    const users = await this.prisma.user.findMany({
      select: { email: true, name: true },
    });

    await this.email.sendStageActivation(stage, users, firstMatch.scheduledAt);
    await this.setConfig(stageOpenKey(stage), 'true');

    this.logger.log(`Stage ${stage} activated — notified ${users.length} users`);
    return { message: `Stage ${stage} activated`, usersNotified: users.length };
  }

  async getStagesStatus(): Promise<Record<MatchStage, 'inactive' | 'open' | 'locked'>> {
    const now = new Date();
    const result = {} as Record<MatchStage, 'inactive' | 'open' | 'locked'>;

    for (const stage of KNOCKOUT_STAGES) {
      const isOpen = await this.getConfig(stageOpenKey(stage));
      if (isOpen !== 'true') {
        result[stage] = 'inactive';
        continue;
      }

      const firstMatch = await this.prisma.match.findFirst({
        where: { stage },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });

      result[stage] = firstMatch && firstMatch.scheduledAt <= now ? 'locked' : 'open';
    }

    return result;
  }

  // Runs daily at 12:00 UTC. Sends a 24h reminder for each activated stage approaching its deadline.
  @Cron('0 12 * * *')
  async sendStageRemindersIfDue(): Promise<void> {
    const now = new Date();
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    for (const stage of KNOCKOUT_STAGES) {
      const isOpen = await this.getConfig(stageOpenKey(stage));
      if (isOpen !== 'true') continue;

      const reminderSent = await this.getConfig(stageReminderKey(stage));
      if (reminderSent === 'true') continue;

      const firstMatch = await this.prisma.match.findFirst({
        where: { stage, status: MatchStatus.SCHEDULED, scheduledAt: { lte: in25h } },
        orderBy: { scheduledAt: 'asc' },
      });
      if (!firstMatch) continue;

      this.logger.log(`Sending 24h reminder for stage ${stage}…`);
      const users = await this.prisma.user.findMany({ select: { email: true, name: true } });
      await this.email.sendStageReminder(stage, users, firstMatch.scheduledAt);
      await this.setConfig(stageReminderKey(stage), 'true');
    }
  }

  async createMatchesBatch(dto: CreateMatchesBatchDto): Promise<{ created: number }> {
    const created = await this.prisma.$transaction(
      dto.matches.map((m) =>
        this.prisma.match.create({
          data: {
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            scheduledAt: new Date(m.scheduledAt),
            stage: m.stage,
            phase: m.phase,
            matchOrder: m.matchOrder ?? null,
          },
        }),
      ),
    );
    this.logger.log(`Batch created ${created.length} matches`);
    return { created: created.length };
  }

  async createMatch(dto: CreateMatchDto) {
    const match = await this.prisma.match.create({
      data: {
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        scheduledAt: new Date(dto.scheduledAt),
        stage: dto.stage,
        phase: dto.phase,
        matchOrder: dto.matchOrder ?? null,
      },
    });
    this.logger.log(`Created match ${match.id}: ${match.homeTeam} vs ${match.awayTeam}`);
    return match;
  }

  async deleteMatch(id: string) {
    const match = await this.prisma.match.findUnique({ where: { id } });
    if (!match) throw new NotFoundException('Partido no encontrado');

    if (match.scheduledAt <= new Date()) {
      throw new BadRequestException('No se puede eliminar un partido que ya comenzó o fue programado en el pasado');
    }

    const predCount = await this.prisma.prediction.count({ where: { matchId: id } });
    if (predCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar — ${predCount} usuario(s) ya tienen predicciones para este partido`,
      );
    }

    await this.prisma.match.delete({ where: { id } });
    this.logger.log(`Deleted match ${id}`);
    return { deleted: true };
  }

  async sendTestEmail(to: string): Promise<{ message: string }> {
    await this.email.sendTestEmail(to);
    return { message: `Test email sent to ${to}` };
  }

  async sendTestStageActivation(to: string, stage: MatchStage): Promise<{ message: string }> {
    const deadline = new Date('2026-07-04T18:00:00.000Z');
    await this.email.sendStageActivation(stage, [{ email: to, name: 'Participante' }], deadline);
    return { message: `Stage activation email (${stage}) sent to ${to}` };
  }

  async sendTestStageReminder(to: string, stage: MatchStage): Promise<{ message: string }> {
    const deadline = new Date('2026-07-04T18:00:00.000Z');
    await this.email.sendStageReminder(stage, [{ email: to, name: 'Participante' }], deadline);
    return { message: `Stage reminder email (${stage}) sent to ${to}` };
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
