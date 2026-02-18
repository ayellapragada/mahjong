import { describe, it, expect } from 'vitest';
import { calculateScoreTransfer } from './scoring';
import type { Seat, ScoreBreakdown } from './types';

describe('calculateScoreTransfer', () => {
  const baseBreakdown: ScoreBreakdown = {
    fan: 3,
    items: [{ name: 'All Triplets', fan: 3 }],
    basePoints: 8,
    totalPoints: 8,
  };

  it('should calculate transfer for self-draw win', () => {
    const transfer = calculateScoreTransfer(
      0 as Seat, // winner
      baseBreakdown,
      true, // self-drawn
      undefined // no discarder
    );

    // Winner gets 8 * 3 = 24 (each opponent pays 8)
    expect(transfer[0]).toBe(24);
    expect(transfer[1]).toBe(-8);
    expect(transfer[2]).toBe(-8);
    expect(transfer[3]).toBe(-8);
  });

  it('should calculate transfer for discard win', () => {
    const transfer = calculateScoreTransfer(
      0 as Seat, // winner
      baseBreakdown,
      false, // not self-drawn
      1 as Seat // discarder
    );

    // Discarder pays double (16), others pay single (8 each)
    // Winner gets 16 + 8 + 8 = 32
    expect(transfer[0]).toBe(32);
    expect(transfer[1]).toBe(-16); // discarder pays double
    expect(transfer[2]).toBe(-8);
    expect(transfer[3]).toBe(-8);
  });

  it('should handle zero fan (chicken hand)', () => {
    const chickenBreakdown: ScoreBreakdown = {
      fan: 0,
      items: [{ name: 'Chicken Hand', fan: 0 }],
      basePoints: 1,
      totalPoints: 1,
    };

    const transfer = calculateScoreTransfer(
      2 as Seat,
      chickenBreakdown,
      false,
      3 as Seat
    );

    expect(transfer[2]).toBe(4); // 2 + 1 + 1
    expect(transfer[3]).toBe(-2); // discarder pays double
    expect(transfer[0]).toBe(-1);
    expect(transfer[1]).toBe(-1);
  });
});
