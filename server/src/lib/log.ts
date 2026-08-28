import { env } from '../config.js';

let seq = 0;
let proc = process.env.PROC ?? 'api';

export function setProc(name: string): void {
  proc = name;
}

const silent = process.env.LOG_LEVEL === 'silent';

export function log(event: string, fields: Record<string, unknown> = {}): void {
  seq += 1;
  if (silent) return;
  const line = { ts: new Date().toISOString(), pod: env.pod, proc, seq, event, ...fields };
  process.stdout.write(JSON.stringify(line) + '\n');
}
