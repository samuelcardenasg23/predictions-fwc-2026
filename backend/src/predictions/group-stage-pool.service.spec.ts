import { MatchPhase } from '@prisma/client';
import {
  GroupStagePoolService,
  MatchPoolFields,
  UserPoolFields,
} from './group-stage-pool.service.js';

describe('GroupStagePoolService (pure logic)', () => {
  // prisma is only used by the async DB methods, not by the pure helpers under test.
  const service = new GroupStagePoolService({} as any);

  const now = new Date('2026-06-13T18:00:00Z');
  const deadline = new Date('2026-06-15T16:00:00Z'); // España vs Cabo Verde

  const match = (overrides: Partial<MatchPoolFields> = {}): MatchPoolFields => ({
    scheduledAt: new Date('2026-06-14T16:00:00Z'),
    excludedFromPool: false,
    phase: MatchPhase.GROUP_STAGE,
    ...overrides,
  });

  const legacy: UserPoolFields = {
    groupStageLockedAt: new Date('2026-06-10T00:00:00Z'),
    groupStageEntryAt: null,
  };
  const lateNew: UserPoolFields = { groupStageLockedAt: null, groupStageEntryAt: null };
  const lateEntered: UserPoolFields = {
    groupStageLockedAt: null,
    groupStageEntryAt: new Date('2026-06-13T15:00:00Z'), // entered at 3pm-ish UTC
  };

  describe('legacy (already finalized) user', () => {
    it('cannot predict — stays locked', () => {
      expect(service.canPredict(legacy, match(), deadline, now)).toBe(false);
    });

    it('still scores every non-excluded group match they predicted', () => {
      expect(service.countsForScoring(legacy, match(), true, deadline, now)).toBe(true);
    });

    it('never scores excluded matches (México vs Sudáfrica)', () => {
      expect(
        service.countsForScoring(legacy, match({ excludedFromPool: true }), true, deadline, now),
      ).toBe(false);
    });
  });

  describe('late entrant', () => {
    it('can predict a future, non-excluded match before the deadline', () => {
      expect(service.canPredict(lateNew, match(), deadline, now)).toBe(true);
    });

    it('cannot predict a match whose kickoff already passed (anti-cheat)', () => {
      const started = match({ scheduledAt: new Date('2026-06-13T12:00:00Z') });
      expect(service.canPredict(lateEntered, started, deadline, now)).toBe(false);
    });

    it('cannot predict an excluded match', () => {
      expect(service.canPredict(lateNew, match({ excludedFromPool: true }), deadline, now)).toBe(false);
    });

    it('pool excludes matches that started before their entry time', () => {
      const beforeEntry = match({ scheduledAt: new Date('2026-06-13T14:00:00Z') }); // before 15:00 entry
      expect(service.isInPool(lateEntered, beforeEntry, deadline, now)).toBe(false);
      expect(service.countsForScoring(lateEntered, beforeEntry, true, deadline, now)).toBe(false);
    });

    it('pool includes matches after their entry time and before the deadline', () => {
      expect(service.isInPool(lateEntered, match(), deadline, now)).toBe(true);
      expect(service.countsForScoring(lateEntered, match(), true, deadline, now)).toBe(true);
    });

    it('pool INCLUDES matches whose kickoff is after the global deadline', () => {
      // The deadline closes saving, it does not shrink the pool.
      const afterDeadline = match({ scheduledAt: new Date('2026-06-15T18:00:00Z') });
      expect(service.isInPool(lateEntered, afterDeadline, deadline, now)).toBe(true);
      expect(service.countsForScoring(lateEntered, afterDeadline, true, deadline, now)).toBe(true);
    });

    it('can still predict a post-deadline-kickoff match while before the deadline', () => {
      const afterDeadline = match({ scheduledAt: new Date('2026-06-15T18:00:00Z') });
      expect(service.canPredict(lateEntered, afterDeadline, deadline, now)).toBe(true);
    });

    it('cannot save once now is at/after the global deadline, even for a future match', () => {
      const afterDeadlineNow = new Date('2026-06-15T16:30:00Z');
      const futureMatch = match({ scheduledAt: new Date('2026-06-16T16:00:00Z') });
      expect(service.canPredict(lateEntered, futureMatch, deadline, afterDeadlineNow)).toBe(false);
      // ...but it remains in the pool and keeps scoring.
      expect(service.isInPool(lateEntered, futureMatch, deadline, afterDeadlineNow)).toBe(true);
    });
  });

  describe('global deadline', () => {
    it('blocks every non-legacy user once it passes', () => {
      const afterDeadline = new Date('2026-06-15T17:00:00Z');
      expect(service.canPredict(lateNew, match(), deadline, afterDeadline)).toBe(false);
    });
  });

  describe('same match: legacy scores, late entrant does not (outside pool)', () => {
    it('scores for legacy but not for a late entrant who entered after kickoff', () => {
      const played = match({ scheduledAt: new Date('2026-06-13T12:00:00Z') }); // before late entry
      expect(service.countsForScoring(legacy, played, true, deadline, now)).toBe(true);
      expect(service.countsForScoring(lateEntered, played, true, deadline, now)).toBe(false);
    });
  });
});
