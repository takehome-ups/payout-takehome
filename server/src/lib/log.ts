import { env } from '../config.js';

let seq = 0;

const silent = process.env.LOG_LEVEL === 'silent';

export function log(event: string, fields: Record<string, unknown> = {}): void {
  seq += 1;
  if (silent) return;
  const line = { ts: new Date().toISOString(), pod: env.pod, seq, event, ...fields };
  process.stdout.write(JSON.stringify(line) + '\n');
}
