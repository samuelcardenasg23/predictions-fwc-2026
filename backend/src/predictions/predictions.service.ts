import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchPhase, MatchStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertPredictionDto } from './dto/upsert-prediction.dto.js';
import { BulkPredictionsDto } from './dto/bulk-predictions.dto.js';

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Group stage: global deadline = first GROUP_STAGE match's scheduledAt.
   * Knockout: each stage has its own deadline = first match of that specific stage.
   *           Stage must also be explicitly activated by admin in SystemConfig.
   */
  private async assertPhaseOpen(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    if (match.phase === MatchPhase.GROUP_STAGE) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupStageLockedAt: true },
      });
      if (user?.groupStageLockedAt) {
        throw new ForbiddenException('Your group stage predictions are locked');
      }

      const firstMatch = await this.prisma.match.findFirst({
        where: { phase: MatchPhase.GROUP_STAGE },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });
      if (firstMatch && firstMatch.scheduledAt <= new Date()) {
        throw new BadRequestException('Predictions are closed for this phase');
      }
    } else {
      // Knockout: stage must be activated by admin
      const stageKey = `knockout_${match.stage.toLowerCase()}_open`;
      const stageOpen = await this.prisma.systemConfig.findUnique({ where: { key: stageKey } });
      if (stageOpen?.value !== 'true') {
        throw new BadRequestException('This knockout stage is not open for predictions yet');
      }

      // User manually finalized this stage
      const userLock = await this.prisma.userStageLock.findUnique({
        where: { userId_stage: { userId, stage: match.stage } },
      });
      if (userLock) {
        throw new ForbiddenException('You have already finalized your predictions for this stage');
      }

      // Auto-lock when first match of this specific stage kicks off
      const firstMatch = await this.prisma.match.findFirst({
        where: { stage: match.stage },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });
      if (firstMatch && firstMatch.scheduledAt <= new Date()) {
        throw new BadRequestException('Predictions are closed for this stage');
      }
    }

    return match;
  }

  async upsert(userId: string, matchId: string, dto: UpsertPredictionDto) {
    await this.assertPhaseOpen(userId, matchId);
    return this.prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId, homeScore: dto.homeScore, awayScore: dto.awayScore },
      update: { homeScore: dto.homeScore, awayScore: dto.awayScore },
      include: { match: true },
    });
  }

  async bulkUpsert(userId: string, dto: BulkPredictionsDto) {
    const results: { id: string; matchId: string; userId: string }[] = [];
    const errors: { matchId: string; error: string }[] = [];

    for (const item of dto.predictions) {
      try {
        await this.assertPhaseOpen(userId, item.matchId);
        const prediction = await this.prisma.prediction.upsert({
          where: { userId_matchId: { userId, matchId: item.matchId } },
          create: { userId, matchId: item.matchId, homeScore: item.homeScore, awayScore: item.awayScore },
          update: { homeScore: item.homeScore, awayScore: item.awayScore },
        });
        results.push(prediction);
      } catch (err: any) {
        errors.push({ matchId: item.matchId, error: err.message });
      }
    }

    return { saved: results.length, errors };
  }

  async lockGroupStage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { groupStageLockedAt: true },
    });

    if (user?.groupStageLockedAt) {
      throw new BadRequestException('Group stage predictions are already locked');
    }

    const [totalGroupMatches, userGroupPreds] = await Promise.all([
      this.prisma.match.count({ where: { phase: MatchPhase.GROUP_STAGE } }),
      this.prisma.prediction.count({
        where: { userId, match: { phase: MatchPhase.GROUP_STAGE } },
      }),
    ]);

    if (userGroupPreds < totalGroupMatches) {
      throw new BadRequestException(
        `Debes completar los ${totalGroupMatches} pronósticos de la fase de grupos antes de finalizar. Te faltan ${totalGroupMatches - userGroupPreds}.`,
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { groupStageLockedAt: new Date() },
      select: { id: true, groupStageLockedAt: true },
    });
  }

  async deleteAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { groupStageLockedAt: true },
    });

    if (user?.groupStageLockedAt) {
      throw new ForbiddenException('Cannot delete locked predictions');
    }

    const { count } = await this.prisma.prediction.deleteMany({ where: { userId } });
    return { deleted: count };
  }

  async lockKnockoutStage(userId: string, stage: MatchStage) {
    // Stage must be activated
    const stageKey = `knockout_${stage.toLowerCase()}_open`;
    const stageOpen = await this.prisma.systemConfig.findUnique({ where: { key: stageKey } });
    if (stageOpen?.value !== 'true') {
      throw new BadRequestException('This knockout stage is not open for predictions yet');
    }

    // Already locked by user
    const existing = await this.prisma.userStageLock.findUnique({
      where: { userId_stage: { userId, stage } },
    });
    if (existing) {
      throw new BadRequestException('Predictions for this stage are already finalized');
    }

    // First kickoff must not have passed
    const firstMatch = await this.prisma.match.findFirst({
      where: { stage },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    });
    if (firstMatch && firstMatch.scheduledAt <= new Date()) {
      throw new BadRequestException('Cannot finalize — this stage has already started');
    }

    // Require ALL matches for this stage to have a prediction
    const [totalStageMatches, predCount] = await Promise.all([
      this.prisma.match.count({ where: { stage } }),
      this.prisma.prediction.count({ where: { userId, match: { stage } } }),
    ]);
    if (predCount < totalStageMatches) {
      throw new BadRequestException(
        `Debes completar los ${totalStageMatches} pronósticos de esta fase antes de finalizar (llevas ${predCount})`,
      );
    }

    return this.prisma.userStageLock.create({ data: { userId, stage } });
  }

  async deleteByStage(userId: string, stage: MatchStage) {
    const firstMatch = await this.prisma.match.findFirst({
      where: { stage },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    });

    if (firstMatch && firstMatch.scheduledAt <= new Date()) {
      throw new ForbiddenException('Cannot delete predictions — this stage has already started');
    }

    const matchIds = await this.prisma.match
      .findMany({ where: { stage }, select: { id: true } })
      .then((ms) => ms.map((m) => m.id));

    const { count } = await this.prisma.prediction.deleteMany({
      where: { userId, matchId: { in: matchIds } },
    });
    return { deleted: count };
  }

  getStageLocks(userId: string) {
    return this.prisma.userStageLock.findMany({ where: { userId } });
  }

  findByUser(userId: string) {
    return this.prisma.prediction.findMany({
      where: { userId },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            scheduledAt: true,
            stage: true,
            phase: true,
            groupName: true,
            status: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
      orderBy: { match: { scheduledAt: 'asc' } },
    });
  }

  findByUserId(_viewerId: string, targetUserId: string) {
    return this.prisma.prediction.findMany({
      where: { userId: targetUserId },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            scheduledAt: true,
            stage: true,
            phase: true,
            groupName: true,
            status: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
      orderBy: { match: { scheduledAt: 'asc' } },
    });
  }
}
