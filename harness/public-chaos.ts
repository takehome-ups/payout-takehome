import { printReport, runChaos } from './core.js';

const report = await runChaos({
  name: 'public chaos',
  targetDir: process.cwd(),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://payout:payout@localhost:54329/payout',
  port: Number(process.env.PORT ?? 3200),
  players: 10,
  bettors: 20,
  loadMs: 20_000,
  workers: 2,
  duplicateEveryMs: 500,
  duplicateBatch: 3,
  lateRedeliveryEveryMs: 0,
  workerKills: 1,
  apiKills: 0,
  restartDelayMs: 1_500,
  settleDeadlineMs: 60_000,
  verifySample: 0,
  seed: Number(process.env.CHAOS_SEED ?? 7),
});

printReport(report);
process.exit(report.ok ? 0 : 1);
