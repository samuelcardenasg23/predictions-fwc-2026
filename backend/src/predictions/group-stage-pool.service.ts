import { Injectable } from '@nestjs/common';
import { MatchPhase } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export const GROUP_STAGE_DEADLINE_KEY = 'group_stage_deadline_at';

/** Subset of User fields needed to compute pool membership. */
export interface UserPoolFields {
  groupStageLockedAt: Date | null;
  groupStageEntryAt: Date | null;
}

/** Subset of Match fields needed to compute pool membership. */
export interface MatchPoolFields {
  scheduledAt: Date;
  excludedFromPool: boolean;
  phase: MatchPhase;
}

export interface GroupStageStatus {
  isLegacyLocked: boolean;
  globalDeadline: string | null;
  deadlinePassed: boolean;
  entryAt: string | null;
  poolSize: number;
  savedCount: number;
  canEdit: boolean;
}

/**
 * Central logic for the reopened group stage:
 *
 * - **Legacy** users (already finalized → `groupStageLockedAt != null`) keep their
 *   predictions; every non-excluded match they predicted still scores.
 * - **Late entrants** (no lock) get a *personal pool*: only non-excluded matches that
 *   kick off after their first save (`groupStageEntryAt`) and before the global deadline.
 * - A single **global deadline** (`SystemConfig.group_stage_deadline_at`) closes the
 *   phase for everyone who isn't already locked.
 * - **Anti-cheat:** a late entrant can only predict matches whose kickoff hasn't passed.
 */
@Injectable()
export class GroupStagePoolService {
  constructor(private readonly prisma: PrismaService) {}

  isLegacyLocked(user: { groupStageLockedAt: Date | null }): boolean {
    return user.groupStageLockedAt != null;
  }

  /** Global group-stage deadline from SystemConfig, or null if unconfigured. */
  async getGlobalDeadline(): Promise<Date | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: GROUP_STAGE_DEADLINE_KEY },
    });
    if (!config?.value) return null;
    const date = new Date(config.value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** Boundary of a late entrant's pool: their fixed entry time, or `now` if not set yet. */
  private effectiveEntryAt(user: UserPoolFields, now: Date): Date {
    return user.groupStageEntryAt ?? now;
  }

  /**
   * Is this match part of the user's personal pool (counts toward their progress/score)?
   *
   * The global deadline closes *saving* (see {@link canPredict}), it does NOT shrink the
   * pool — a late entrant's pool spans every non-excluded group match after their entry,
   * regardless of whether kickoff is before or after the deadline.
   */
  isInPool(
    user: UserPoolFields,
    match: MatchPoolFields,
    _deadline: Date | null,
    now: Date,
  ): boolean {
    if (match.phase !== MatchPhase.GROUP_STAGE) return false;
    if (match.excludedFromPool) return false;
    if (this.isLegacyLocked(user)) return true;
    return match.scheduledAt > this.effectiveEntryAt(user, now);
  }

  /** Can the user create/update a prediction for this match right now? */
  canPredict(
    user: UserPoolFields,
    match: MatchPoolFields,
    deadline: Date | null,
    now: Date,
  ): boolean {
    if (match.phase !== MatchPhase.GROUP_STAGE) return false;
    if (this.isLegacyLocked(user)) return false;
    if (deadline && now >= deadline) return false;
    if (match.excludedFromPool) return false;
    if (match.scheduledAt <= now) return false; // anti-cheat: kickoff passed
    return this.isInPool(user, match, deadline, now);
  }

  /** Does a prediction on this match count toward the user's score? */
  countsForScoring(
    user: UserPoolFields,
    match: MatchPoolFields,
    hasPrediction: boolean,
    deadline: Date | null,
    now: Date,
  ): boolean {
    if (!hasPrediction) return false;
    if (match.excludedFromPool) return false;
    if (this.isLegacyLocked(user)) return true;
    return this.isInPool(user, match, deadline, now);
  }

  /**
   * Fix a late entrant's pool boundary on their first group-stage save.
   * Idempotent and a no-op for legacy (locked) users or anyone already set.
   */
  async ensureEntryAt(userId: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId, groupStageEntryAt: null, groupStageLockedAt: null },
      data: { groupStageEntryAt: new Date() },
    });
  }

  /** Snapshot of the user's group-stage state for the frontend. */
  async getStatus(userId: string): Promise<GroupStageStatus> {
    const now = new Date();
    const [user, deadline, matches, predictions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { groupStageLockedAt: true, groupStageEntryAt: true },
      }),
      this.getGlobalDeadline(),
      this.prisma.match.findMany({
        where: { phase: MatchPhase.GROUP_STAGE },
        select: { id: true, scheduledAt: true, excludedFromPool: true, phase: true },
      }),
      this.prisma.prediction.findMany({
        where: { userId, match: { phase: MatchPhase.GROUP_STAGE } },
        select: { matchId: true },
      }),
    ]);

    const safeUser: UserPoolFields = {
      groupStageLockedAt: user?.groupStageLockedAt ?? null,
      groupStageEntryAt: user?.groupStageEntryAt ?? null,
    };

    const predictedIds = new Set(predictions.map((p) => p.matchId));
    const legacy = this.isLegacyLocked(safeUser);
    const deadlinePassed = deadline ? now >= deadline : false;

    let poolSize: number;
    let savedCount: number;
    if (legacy) {
      // Locked users keep a fixed quiniela: progress is just their non-excluded
      // predictions — don't recompute a broad pool that would show them "incomplete".
      const nonExcluded = matches.filter(
        (m) => !m.excludedFromPool && predictedIds.has(m.id),
      ).length;
      poolSize = nonExcluded;
      savedCount = nonExcluded;
    } else {
      const poolIds = matches
        .filter((m) => this.isInPool(safeUser, m, deadline, now))
        .map((m) => m.id);
      poolSize = poolIds.length;
      savedCount = poolIds.filter((id) => predictedIds.has(id)).length;
    }

    return {
      isLegacyLocked: legacy,
      globalDeadline: deadline ? deadline.toISOString() : null,
      deadlinePassed,
      entryAt: safeUser.groupStageEntryAt ? safeUser.groupStageEntryAt.toISOString() : null,
      poolSize,
      savedCount,
      canEdit: !legacy && !deadlinePassed,
    };
  }
}
