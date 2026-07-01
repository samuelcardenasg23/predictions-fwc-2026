import {
  DEFAULT_KNOCKOUT_LEAD_MINUTES,
  isKnockoutEditable,
  knockoutCloseAt,
  parseLeadMinutes,
} from './knockout-window.util.js';

describe('knockout-window.util', () => {
  describe('parseLeadMinutes', () => {
    it('defaults when missing', () => {
      expect(parseLeadMinutes(null)).toBe(DEFAULT_KNOCKOUT_LEAD_MINUTES);
      expect(parseLeadMinutes(undefined)).toBe(DEFAULT_KNOCKOUT_LEAD_MINUTES);
    });

    it('defaults on invalid input', () => {
      expect(parseLeadMinutes('abc')).toBe(DEFAULT_KNOCKOUT_LEAD_MINUTES);
      expect(parseLeadMinutes('-5')).toBe(DEFAULT_KNOCKOUT_LEAD_MINUTES);
    });

    it('parses valid values, including zero', () => {
      expect(parseLeadMinutes('30')).toBe(30);
      expect(parseLeadMinutes('0')).toBe(0);
      expect(parseLeadMinutes('120')).toBe(120);
    });
  });

  describe('knockoutCloseAt', () => {
    it('subtracts the lead time from kickoff', () => {
      const kickoff = new Date('2026-07-10T20:00:00.000Z');
      expect(knockoutCloseAt(kickoff, 60).toISOString()).toBe(
        '2026-07-10T19:00:00.000Z',
      );
      expect(knockoutCloseAt(kickoff, 0).toISOString()).toBe(
        '2026-07-10T20:00:00.000Z',
      );
    });
  });

  describe('isKnockoutEditable', () => {
    const kickoff = new Date('2026-07-10T20:00:00.000Z'); // closes 19:00 with 60min lead

    it('editable well before the window closes', () => {
      expect(isKnockoutEditable(kickoff, 60, new Date('2026-07-10T18:59:00.000Z'))).toBe(true);
    });

    it('closed exactly at the close instant', () => {
      expect(isKnockoutEditable(kickoff, 60, new Date('2026-07-10T19:00:00.000Z'))).toBe(false);
    });

    it('closed after the close instant but before kickoff', () => {
      expect(isKnockoutEditable(kickoff, 60, new Date('2026-07-10T19:30:00.000Z'))).toBe(false);
    });

    it('closed once kickoff has passed', () => {
      expect(isKnockoutEditable(kickoff, 60, new Date('2026-07-10T20:30:00.000Z'))).toBe(false);
    });

    it('with zero lead, editable right up to kickoff', () => {
      expect(isKnockoutEditable(kickoff, 0, new Date('2026-07-10T19:59:59.000Z'))).toBe(true);
      expect(isKnockoutEditable(kickoff, 0, new Date('2026-07-10T20:00:00.000Z'))).toBe(false);
    });
  });
});
