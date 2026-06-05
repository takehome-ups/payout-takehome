import type { Paytable, Symbol } from '../game/config.js';

export interface LineWin {
  line: number;
  symbol: Symbol;
  count: number;
  multiplier: number;
}

export type Grid = Symbol[][];

export function lineSymbols(grid: Grid, payline: number[]): Symbol[] {
  return payline.map((row, reel) => grid[reel][row]);
}

function leadingRun(symbols: Symbol[], matches: (s: Symbol) => boolean): number {
  let n = 0;
  while (n < symbols.length && matches(symbols[n])) n++;
  return n;
}

export function evaluateLine(symbols: Symbol[], line: number, table: Paytable): LineWin[] {
  const { wild, minRun, pays } = table;
  const wins: LineWin[] = [];

  const wildRun = leadingRun(symbols, (s) => s === wild);
  if (wildRun >= minRun) {
    wins.push({ line, symbol: wild, count: wildRun, multiplier: pays[wild][wildRun] });
  }

  if (wildRun < symbols.length) {
    const target = symbols[wildRun];
    const run = leadingRun(symbols, (s) => s === target || s === wild);
    const multiplier = pays[target]?.[run] ?? 0;
    if (run >= minRun && multiplier > 0) {
      wins.push({ line, symbol: target, count: run, multiplier });
    }
  }

  return wins;
}

export function evaluateGrid(grid: Grid, table: Paytable): LineWin[] {
  return table.paylines.flatMap((payline, line) => evaluateLine(lineSymbols(grid, payline), line, table));
}
