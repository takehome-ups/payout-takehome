import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Symbol = string;

export interface ReelConfig {
  rows: number;
  strips: Symbol[][];
}

export interface Paytable {
  lines: number;
  wild: Symbol;
  minRun: number;
  pays: Record<Symbol, Record<string, number>>;
  paylines: number[][];
}

const configDir = process.env.GAME_CONFIG_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '../../../config');

const load = <T>(file: string): T => JSON.parse(readFileSync(join(configDir, file), 'utf8')) as T;

export const reels = load<ReelConfig>('reels.json');
export const paytable = load<Paytable>('paytable.json');
