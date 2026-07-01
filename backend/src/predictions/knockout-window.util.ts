/**
 * Per-match prediction window for knockout stages.
 *
 * Unlike the group stage (single global deadline), every knockout match closes
 * on its own: a user can edit their prediction until `leadMinutes` before that
 * specific match's kickoff. This lets players submit some picks now and others
 * later, instead of being forced to complete a whole round before the first game.
 *
 * The close time is always *derived* from `scheduledAt` — never stored — so if a
 * match is rescheduled the window recomputes automatically.
 */

/** SystemConfig key holding the lead time, in minutes, as a string. */
export const KNOCKOUT_LEAD_TIME_KEY = 'prediction_lead_time_minutes';

/** Default lead time when the SystemConfig value is missing or invalid. */
export const DEFAULT_KNOCKOUT_LEAD_MINUTES = 60;

/** Parse the raw SystemConfig value into a non-negative minute count. */
export function parseLeadMinutes(raw: string | null | undefined): number {
  if (raw == null) return DEFAULT_KNOCKOUT_LEAD_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_KNOCKOUT_LEAD_MINUTES;
}

/** The instant a match's prediction window closes: `scheduledAt − leadMinutes`. */
export function knockoutCloseAt(scheduledAt: Date, leadMinutes: number): Date {
  return new Date(scheduledAt.getTime() - leadMinutes * 60_000);
}

/** Whether this match can still be predicted right now. */
export function isKnockoutEditable(
  scheduledAt: Date,
  leadMinutes: number,
  now: Date,
): boolean {
  return now < knockoutCloseAt(scheduledAt, leadMinutes);
}
