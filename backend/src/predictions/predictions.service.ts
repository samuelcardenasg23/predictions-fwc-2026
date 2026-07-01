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
import { GroupStagePoolService } from './group-stage-pool.service.js';
import {
  KNOCKOUT_LEAD_TIME_KEY,
  isKnockoutEditable,
  parseLeadMinutes,
} from './knockout-window.util.js';

@Injectable()
export class PredictionsService {
  constructor(
    private prisma: PrismaService,
    private pool: GroupStagePoolService,
  ) {}

  /**
   * Group stage: per-user personal pool + a single global deadline
   *              (SystemConfig.group_stage_deadline_at). See GroupStagePoolService.
   * Knockout: each *match* has its own deadline = leadMinutes before its kickoff
   *           (see knockout-window.util). Stage must also be explicitly activated
   *           by admin in SystemConfig.
   */
  private async assertPhaseOpen(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    if (match.phase === MatchPhase.GROUP_STAGE) {
      const now = new Date();
      const [user, deadline] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { groupStageLockedAt: true, groupStageEntryAt: true },
        }),
        this.pool.getGlobalDeadline(),
      ]);
      if (!user) throw new NotFoundException(`User ${userId} not found`);

      // Legacy users that already finalized stay locked.
      if (this.pool.isLegacyLocked(user)) {
        throw new ForbiddenException('Your group stage predictions are locked');
      }
      // Single global deadline closes the whole phase for everyone not locked.
      if (deadline && now >= deadline) {
        throw new BadRequestException('El plazo para pronosticar la fase de grupos ya cerró');
      }
      // Excluded matches (e.g. México vs Sudáfrica) are read-only for everyone.
      if (match.excludedFromPool) {
        throw new BadRequestException('This match is excluded from the pool and cannot be predicted');
      }
      // Anti-cheat: this match's kickoff already passed.
      if (match.scheduledAt <= now) {
        throw new BadRequestException('Predictions are closed for this match');
      }
      // Defensive: late entrants can only touch matches inside their personal pool.
      if (!this.pool.isInPool(user, match, deadline, now)) {
        throw new BadRequestException('This match is outside your prediction pool');
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

      // Per-match window: closes leadMinutes before THIS match's kickoff, so a
      // user can still predict later matches of the round after earlier ones start.
      const leadMinutes = await this.getKnockoutLeadMinutes();
      if (!isKnockoutEditable(match.scheduledAt, leadMinutes, new Date())) {
        throw new BadRequestException('El plazo para pronosticar este partido ya cerró');
      }
    }

    return match;
  }

  /** Knockout prediction lead time (minutes before kickoff), from SystemConfig. */
  private async getKnockoutLeadMinutes(): Promise<number> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: KNOCKOUT_LEAD_TIME_KEY },
    });
    return parseLeadMinutes(config?.value);
  }

  async upsert(userId: string, matchId: string, dto: UpsertPredictionDto) {
    const match = await this.assertPhaseOpen(userId, matchId);
    if (match.phase === MatchPhase.GROUP_STAGE) {
      // First group-stage save fixes a late entrant's personal pool boundary.
      await this.pool.ensureEntryAt(userId);
    }
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
    let entryFixed = false;

    for (const item of dto.predictions) {
      try {
        const match = await this.assertPhaseOpen(userId, item.matchId);
        const prediction = await this.prisma.prediction.upsert({
          where: { userId_matchId: { userId, matchId: item.matchId } },
          create: { userId, matchId: item.matchId, homeScore: item.homeScore, awayScore: item.awayScore },
          update: { homeScore: item.homeScore, awayScore: item.awayScore },
        });
        if (match.phase === MatchPhase.GROUP_STAGE && !entryFixed) {
          await this.pool.ensureEntryAt(userId);
          entryFixed = true;
        }
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

    // Late entrants must complete their *personal* pool, not the whole calendar.
    const status = await this.pool.getStatus(userId);

    if (status.deadlinePassed) {
      throw new BadRequestException('El plazo de la fase de grupos ya cerró');
    }
    if (status.poolSize === 0) {
      throw new BadRequestException('No tienes partidos disponibles para pronosticar en este momento');
    }
    if (status.savedCount < status.poolSize) {
      throw new BadRequestException(
        `Debes completar los ${status.poolSize} pronósticos de tu quiniela antes de finalizar. Te faltan ${status.poolSize - status.savedCount}.`,
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { groupStageLockedAt: new Date() },
      select: { id: true, groupStageLockedAt: true },
    });
  }

  getGroupStageStatus(userId: string) {
    return this.pool.getStatus(userId);
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

    // Finalizing is optional now (each match auto-closes leadMinutes before its
    // own kickoff). Only block once the WHOLE round is already closed — there is
    // nothing left to lock — otherwise let the user commit early.
    const now = new Date();
    const leadMinutes = await this.getKnockoutLeadMinutes();
    const stageMatches = await this.prisma.match.findMany({
      where: { stage },
      select: { scheduledAt: true },
    });
    const anyOpen = stageMatches.some((m) =>
      isKnockoutEditable(m.scheduledAt, leadMinutes, now),
    );
    if (!anyOpen) {
      throw new BadRequestException('Cannot finalize — this stage is already closed');
    }

    // Require ALL matches for this stage to have a prediction
    const [totalStageMatches, predCount] = [
      stageMatches.length,
      await this.prisma.prediction.count({ where: { userId, match: { stage } } }),
    ];
    if (predCount < totalStageMatches) {
      throw new BadRequestException(
        `Debes completar los ${totalStageMatches} pronósticos de esta fase antes de finalizar (llevas ${predCount})`,
      );
    }

    return this.prisma.userStageLock.create({ data: { userId, stage } });
  }

  async deleteByStage(userId: string, stage: MatchStage) {
    // A user manually finalized this stage → nothing is editable anymore.
    const userLock = await this.prisma.userStageLock.findUnique({
      where: { userId_stage: { userId, stage } },
    });
    if (userLock) {
      throw new ForbiddenException('Cannot delete predictions — this stage is finalized');
    }

    // Only clear predictions on matches whose window is still open. Matches that
    // already closed can't be re-entered, so leave them untouched.
    const now = new Date();
    const leadMinutes = await this.getKnockoutLeadMinutes();
    const matches = await this.prisma.match.findMany({
      where: { stage },
      select: { id: true, scheduledAt: true },
    });
    const openIds = matches
      .filter((m) => isKnockoutEditable(m.scheduledAt, leadMinutes, now))
      .map((m) => m.id);

    const { count } = await this.prisma.prediction.deleteMany({
      where: { userId, matchId: { in: openIds } },
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
