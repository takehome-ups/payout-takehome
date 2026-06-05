import { paytable, reels, type Paytable, type ReelConfig } from '../game/config.js';
import { reelStops } from '../rng/seeded.js';
import { evaluateGrid, type Grid, type LineWin } from './paylines.js';

export interface SpinResult {
  stops: number[];
  grid: Grid;
  lineWins: LineWin[];
  win: number;
}

export function gridFromStops(stops: number[], config: ReelConfig = reels): Grid {
  return config.strips.map((strip, reel) =>
    Array.from({ length: config.rows }, (_, row) => strip[(stops[reel] + row) % strip.length]),
  );
}

export function settleStops(stops: number[], stake: number, config: ReelConfig = reels, table: Paytable = paytable): SpinResult {
  const grid = gridFromStops(stops, config);
  const lineWins = evaluateGrid(grid, table);
  const lineBet = stake / table.lines;
  const win = lineWins.reduce((sum, w) => sum + w.multiplier * lineBet, 0);
  return { stops, grid, lineWins, win };
}

export function spin(serverSeed: string, clientSeed: string, nonce: number, stake: number): SpinResult {
  const stops = reelStops(serverSeed, clientSeed, nonce, reels.strips.map((s) => s.length));
  return settleStops(stops, stake);
}
