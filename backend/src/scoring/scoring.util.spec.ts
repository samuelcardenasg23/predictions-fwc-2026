import { calculatePoints } from './scoring.util.js';

describe('calculatePoints', () => {
  // ── GROUP stage (exact=3, outcome=1) ─────────────────────────────────────

  describe('GROUP stage', () => {
    const stage = 'GROUP' as const;

    it('gives 3 pts for exact home-win result', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 2, awayScore: 0, stage })).toBe(3);
    });

    it('gives 3 pts for exact away-win result', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 0, awayScore: 1, stage })).toBe(3);
    });

    it('gives 3 pts for exact draw', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1, stage })).toBe(3);
    });

    it('gives 1 pt for correct home-win outcome but wrong score', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 3, awayScore: 1, stage })).toBe(1);
    });

    it('gives 1 pt for correct draw outcome but different score', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 0 }, { homeScore: 2, awayScore: 2, stage })).toBe(1);
    });

    it('gives 1 pt for correct away-win outcome but wrong score', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 1, awayScore: 3, stage })).toBe(1);
    });

    it('gives 0 pts when outcome is completely wrong', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 0, awayScore: 1, stage })).toBe(0);
    });

    it('gives 0 pts when predicting draw but match ends in win', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 2, awayScore: 0, stage })).toBe(0);
    });
  });

  // ── Knockout multipliers ──────────────────────────────────────────────────

  describe('R16 stage (exact=6, outcome=2)', () => {
    const stage = 'R16' as const;

    it('gives 6 pts for exact result', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1, stage })).toBe(6);
    });

    it('gives 2 pts for correct outcome', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 3, awayScore: 0, stage })).toBe(2);
    });

    it('gives 0 pts for wrong outcome', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 2, awayScore: 0, stage })).toBe(0);
    });
  });

  describe('QF stage (exact=9, outcome=3)', () => {
    const stage = 'QF' as const;

    it('gives 9 pts for exact result', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1, stage })).toBe(9);
    });

    it('gives 3 pts for correct outcome', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 0 }, { homeScore: 1, awayScore: 0, stage })).toBe(3);
    });
  });

  describe('SF stage (exact=12, outcome=4)', () => {
    const stage = 'SF' as const;

    it('gives 12 pts for exact result', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 2 }, { homeScore: 0, awayScore: 2, stage })).toBe(12);
    });

    it('gives 4 pts for correct outcome', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 0, awayScore: 3, stage })).toBe(4);
    });
  });

  describe('FINAL stage (exact=15, outcome=5)', () => {
    const stage = 'FINAL' as const;

    it('gives 15 pts for exact final result', () => {
      expect(calculatePoints({ homeScore: 3, awayScore: 2 }, { homeScore: 3, awayScore: 2, stage })).toBe(15);
    });

    it('gives 5 pts for correct outcome in final', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 0, stage })).toBe(5);
    });

    it('gives 0 pts for wrong outcome in final', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 2 }, { homeScore: 1, awayScore: 0, stage })).toBe(0);
    });
  });

  describe('THIRD_PLACE stage (exact=12, outcome=4)', () => {
    const stage = 'THIRD_PLACE' as const;

    it('gives 12 pts for exact result', () => {
      expect(calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1, stage })).toBe(12);
    });

    it('gives 4 pts for correct outcome', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 2, awayScore: 0, stage })).toBe(4);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('gives 3 pts for exact 0-0 result in GROUP', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 0 }, { homeScore: 0, awayScore: 0, stage: 'GROUP' })).toBe(3);
    });

    it('gives 1 pt for draw prediction vs different draw (GROUP)', () => {
      expect(calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 3, awayScore: 3, stage: 'GROUP' })).toBe(1);
    });

    it('gives 0 pts when predicting away win but actual is draw (GROUP)', () => {
      expect(calculatePoints({ homeScore: 0, awayScore: 1 }, { homeScore: 1, awayScore: 1, stage: 'GROUP' })).toBe(0);
    });
  });
});
