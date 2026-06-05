import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchPhase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpsertPredictionDto } from './dto/upsert-prediction.dto.js';
import { BulkPredictionsDto } from './dto/bulk-predictions.dto.js';

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Group stage: all 72 matches share ONE global deadline — the first match's scheduledAt.
   * Knockout: same logic — first R32 match's scheduledAt becomes the knockout deadline.
   */
  private async assertPhaseOpen(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    // Phase deadline = earliest scheduledAt of the same phase
    const firstMatch = await this.prisma.match.findFirst({
      where: { phase: match.phase },
      orderBy: { scheduledAt: 'asc' },
      select: { scheduledAt: true },
    });

    if (firstMatch && firstMatch.scheduledAt <= new Date()) {
      throw new BadRequestException('Predictions are closed for this phase');
    }

    // Manual group-stage lock
    if (match.phase === MatchPhase.GROUP_STAGE) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupStageLockedAt: true },
      });
      if (user?.groupStageLockedAt) {
        throw new ForbiddenException('Your group stage predictions are locked');
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
          create: {
            userId,
            matchId: item.matchId,
            homeScore: item.homeScore,
            awayScore: item.awayScore,
          },
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

    // Require ALL group stage matches to have a prediction
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
