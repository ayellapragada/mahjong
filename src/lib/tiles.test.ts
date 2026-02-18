import { describe, it, expect } from 'vitest';
import { tileToSvgPath, tileToUnicode } from './tiles';
import type { Tile } from '../game/types';

describe('tileToSvgPath', () => {
  it('returns correct path for suited tiles', () => {
    const tile: Tile = { type: 'suited', suit: 'dots', value: 1 };
    expect(tileToSvgPath(tile)).toBe('/tiles/dots-1.svg');
  });

  it('returns correct path for wind tiles', () => {
    const tile: Tile = { type: 'wind', direction: 'east' };
    expect(tileToSvgPath(tile)).toBe('/tiles/wind-east.svg');
  });

  it('returns correct path for dragon tiles', () => {
    const tile: Tile = { type: 'dragon', color: 'red' };
    expect(tileToSvgPath(tile)).toBe('/tiles/dragon-red.svg');
  });

  it('returns correct path for bonus tiles', () => {
    const tile: Tile = { type: 'bonus', bonusType: 'flower', number: 1 };
    expect(tileToSvgPath(tile)).toBe('/tiles/flower-1.svg');
  });
});
