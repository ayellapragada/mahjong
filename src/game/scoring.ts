import type { Seat, ScoreBreakdown } from './types';

/**
 * Calculate score transfers for a winning hand.
 *
 * HK Simplified Rules:
 * - Self-draw: all 3 opponents pay base points
 * - Discard win: discarder pays double, others pay single
 *
 * @returns Record of score changes per seat (positive = gain, negative = loss)
 */
export function calculateScoreTransfer(
  winner: Seat,
  breakdown: ScoreBreakdown,
  isSelfDrawn: boolean,
  discarder?: Seat
): Record<Seat, number> {
  const base = breakdown.totalPoints;
  const transfer: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

  const seats: Seat[] = [0, 1, 2, 3];
  const losers = seats.filter(s => s !== winner);

  if (isSelfDrawn) {
    // All opponents pay equally
    for (const loser of losers) {
      transfer[loser] = -base;
      transfer[winner] += base;
    }
  } else {
    // Discarder pays double, others pay single
    for (const loser of losers) {
      const payment = loser === discarder ? base * 2 : base;
      transfer[loser] = -payment;
      transfer[winner] += payment;
    }
  }

  return transfer;
}
