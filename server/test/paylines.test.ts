import { describe, expect, it } from 'vitest';
import { paytable } from '../src/game/config.js';
import { evaluateLine } from '../src/rounds/paylines.js';

describe('evaluateLine', () => {
  it('pays three of a kind from reel 1', () => {
    const wins = evaluateLine(['H1', 'H1', 'H1', 'L2', 'L3'], 0, paytable);
    expect(wins).toEqual([{ line: 0, symbol: 'H1', count: 3, multiplier: 25 }]);
  });

  it('does not pay runs that do not start on reel 1', () => {
    expect(evaluateLine(['L2', 'H1', 'H1', 'H1', 'H1'], 0, paytable)).toEqual([]);
  });

  it('substitutes wilds for paying symbols', () => {
    const wins = evaluateLine(['H2', 'W', 'H2', 'H2', 'L1'], 0, paytable);
    expect(wins).toEqual([{ line: 0, symbol: 'H2', count: 4, multiplier: 75 }]);
  });

  it('pays five wilds as the wild prize', () => {
    const wins = evaluateLine(['W', 'W', 'W', 'W', 'W'], 0, paytable);
    expect(wins).toEqual([{ line: 0, symbol: 'W', count: 5, multiplier: 1000 }]);
  });
});
