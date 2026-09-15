import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';

export interface ChaosConfig {
  name: string;
  targetDir: string;
  databaseUrl: string;
  port: number;
  players: number;
  bettors: number;
  loadMs: number;
  workers: number;
  duplicateEveryMs: number;
  duplicateBatch: number;
  lateRedeliveryEveryMs: number;
  workerKills: number;
  apiKills: number;
  restartDelayMs: number;
  settleDeadlineMs: number;
  verifySample: number;
  checkWin?: (round: RoundView) => string | null;
  seed: number;
}

export interface RoundView {
  id: string;
  playerId: string;
  stake: number;
  win: number;
  status: string;
  stops: number[];
}

export interface InvariantResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ChaosReport {
  name: string;
  accepted: number;
  rejected: number;
  unknown: number;
  duplicatesInjected: number;
  lateRedeliveries: number;
  kills: string[];
  invariants: InvariantResult[];
  ok: boolean;
}

const INITIAL_BALANCE = 200_000;
const STAKES = [10, 20, 50, 100, 200];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

class Proc {
  child: ChildProcess | null = null;
  output: string[] = [];

  constructor(
    readonly label: string,
    readonly script: string,
    readonly cwd: string,
    readonly env: NodeJS.ProcessEnv,
  ) {}

  start(): void {
    this.child = spawn('npm', ['run', '--silent', this.script], {
      cwd: this.cwd,
      env: { ...process.env, ...this.env },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const keep = (buf: Buffer) => {
      this.output.push(buf.toString());
      if (this.output.length > 200) this.output.shift();
    };
    this.child.stdout?.on('data', keep);
    this.child.stderr?.on('data', keep);
  }

  kill(signal: NodeJS.Signals = 'SIGKILL'): void {
    if (!this.child?.pid) return;
    try {
      process.kill(-this.child.pid, signal);
    } catch {
      return;
    }
    this.child = null;
  }
}

async function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

async function waitHealthy(base: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`API at ${base} did not become healthy`);
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function runChaos(cfg: ChaosConfig): Promise<ChaosReport> {
  const random = rng(cfg.seed);
  const base = `http://127.0.0.1:${cfg.port}`;
  const env = { DATABASE_URL: cfg.databaseUrl, PORT: String(cfg.port), LOG_LEVEL: 'silent' };
  const db = new pg.Client({ connectionString: cfg.databaseUrl });
  const kills: string[] = [];
  const report: ChaosReport = { name: cfg.name, accepted: 0, rejected: 0, unknown: 0, duplicatesInjected: 0, lateRedeliveries: 0, kills, invariants: [], ok: false };

  await run('npm', ['run', '--silent', 'db:reset'], cfg.targetDir, env);
  await db.connect();

  const api = new Proc('api', 'start', cfg.targetDir, { ...env, POD: 'harness-api' });
  const workers = Array.from({ length: cfg.workers }, (_, i) => new Proc(`worker-${i}`, 'worker', cfg.targetDir, { ...env, POD: `harness-w${i}` }));
  api.start();
  workers.forEach((w) => w.start());

  try {
    await waitHealthy(base);
    const players = Array.from({ length: cfg.players }, (_, i) => `chaos_${cfg.seed}_${i}`);
    for (const playerId of players) {
      const res = await fetch(`${base}/admin/wallets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ playerId, balance: INITIAL_BALANCE }),
      });
      if (!res.ok) throw new Error(`could not create wallet ${playerId}: ${res.status}`);
    }

    const acceptedIds = new Set<string>();
    const loadUntil = Date.now() + cfg.loadMs;

    const bettor = async () => {
      while (Date.now() < loadUntil) {
        const playerId = players[Math.floor(random() * players.length)];
        const stake = STAKES[Math.floor(random() * STAKES.length)];
        try {
          const res = await fetch(`${base}/bets`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ playerId, stake, clientSeed: `c${Math.floor(random() * 1e6)}` }),
            signal: AbortSignal.timeout(10_000),
          });
          if (res.status === 201) {
            report.accepted += 1;
            acceptedIds.add((await json<RoundView>(res)).id);
          } else {
            report.rejected += 1;
            await res.body?.cancel();
          }
        } catch {
          report.unknown += 1;
          await sleep(100);
        }
      }
    };

    const duplicator = async () => {
      while (Date.now() < loadUntil) {
        await sleep(cfg.duplicateEveryMs);
        const { rowCount } = await db.query(
          `INSERT INTO queue_messages (topic, payload)
           SELECT topic, payload FROM queue_messages ORDER BY random() LIMIT $1`,
          [cfg.duplicateBatch],
        );
        report.duplicatesInjected += rowCount ?? 0;
      }
    };

    const lateRedelivery = async () => {
      if (!cfg.lateRedeliveryEveryMs) return;
      while (Date.now() < loadUntil) {
        await sleep(cfg.lateRedeliveryEveryMs);
        const { rowCount } = await db.query(
          `INSERT INTO queue_messages (topic, payload)
           SELECT topic, payload FROM queue_messages WHERE acked_at IS NOT NULL ORDER BY id DESC LIMIT $1`,
          [cfg.duplicateBatch],
        );
        report.lateRedeliveries += rowCount ?? 0;
      }
    };

    const killer = async () => {
      const events = [
        ...Array.from({ length: cfg.workerKills }, () => 'worker' as const),
        ...Array.from({ length: cfg.apiKills }, () => 'api' as const),
      ].map((kind) => ({ kind, at: 1_000 + random() * (cfg.loadMs - 2_000) }))
        .sort((a, b) => a.at - b.at);
      const started = Date.now();
      for (const e of events) {
        await sleep(Math.max(0, started + e.at - Date.now()));
        if (e.kind === 'worker') {
          const w = workers[Math.floor(random() * workers.length)];
          w.kill();
          kills.push(`${w.label}@${Math.round(e.at)}ms`);
          await sleep(cfg.restartDelayMs);
          w.start();
        } else {
          api.kill();
          kills.push(`api@${Math.round(e.at)}ms`);
          await sleep(cfg.restartDelayMs);
          api.start();
          await waitHealthy(base);
        }
      }
    };

    await Promise.all([...Array.from({ length: cfg.bettors }, bettor), duplicator(), lateRedelivery(), killer()]);
    await waitHealthy(base);

    const fetchRounds = async () => {
      const all: RoundView[] = [];
      for (const playerId of players) all.push(...(await json<RoundView[]>(await fetch(`${base}/players/${playerId}/rounds`))));
      return all;
    };

    const deadline = Date.now() + cfg.settleDeadlineMs;
    let rounds = await fetchRounds();
    while (rounds.some((r) => r.status !== 'SETTLED') && Date.now() < deadline) {
      await sleep(1_000);
      rounds = await fetchRounds();
    }

    report.invariants = await checkInvariants(cfg, base, players, rounds, acceptedIds);
    report.ok = report.invariants.every((i) => i.ok);
    return report;
  } finally {
    api.kill();
    workers.forEach((w) => w.kill());
    await db.end();
  }
}

async function checkInvariants(
  cfg: ChaosConfig,
  base: string,
  players: string[],
  rounds: RoundView[],
  acceptedIds: Set<string>,
): Promise<InvariantResult[]> {
  const results: InvariantResult[] = [];
  const ids = new Set(rounds.map((r) => r.id));

  const missing = [...acceptedIds].filter((id) => !ids.has(id));
  results.push({
    name: 'every accepted bet has a round',
    ok: missing.length === 0,
    detail: missing.length ? `${missing.length} accepted bets have no round, e.g. ${missing.slice(0, 3).join(', ')}` : `${acceptedIds.size} accepted`,
  });

  const unsettled = rounds.filter((r) => r.status !== 'SETTLED');
  results.push({
    name: `every round settles within ${cfg.settleDeadlineMs / 1000}s`,
    ok: unsettled.length === 0,
    detail: unsettled.length
      ? `${unsettled.length} rounds not settled (${[...new Set(unsettled.map((r) => r.status))].join(', ')}), e.g. ${unsettled[0].id}`
      : `${rounds.length} rounds settled`,
  });

  const drift: string[] = [];
  let totalDrift = 0;
  for (const playerId of players) {
    const wallet = await json<{ balance: number }>(await fetch(`${base}/wallets/${playerId}`));
    const mine = rounds.filter((r) => r.playerId === playerId);
    const expected = INITIAL_BALANCE - mine.reduce((s, r) => s + r.stake, 0) + mine.reduce((s, r) => s + (r.status === 'SETTLED' ? r.win : 0), 0);
    if (wallet.balance !== expected) {
      drift.push(`${playerId}: balance ${wallet.balance}, expected ${expected} (${wallet.balance - expected > 0 ? '+' : ''}${wallet.balance - expected})`);
      totalDrift += wallet.balance - expected;
    }
  }
  results.push({
    name: 'wallet balance = initial − stakes + wins of settled rounds',
    ok: drift.length === 0,
    detail: drift.length ? `${drift.length}/${players.length} wallets drifted, net ${totalDrift}: ${drift.slice(0, 4).join('; ')}` : 'all wallets reconcile',
  });

  if (cfg.checkWin) {
    const wrong = rounds.map((r) => cfg.checkWin!(r)).filter((x): x is string => x !== null);
    results.push({
      name: 'round wins follow the game spec',
      ok: wrong.length === 0,
      detail: wrong.length ? `${wrong.length} rounds paid off-spec, e.g. ${wrong[0]}` : `${rounds.length} rounds checked`,
    });
  }

  if (cfg.verifySample > 0) {
    const sample = rounds.filter((r) => r.status === 'SETTLED').slice(0, cfg.verifySample);
    const failures: string[] = [];
    for (const r of sample) {
      try {
        const res = await fetch(`${base}/rounds/${r.id}/verify`);
        const body = res.ok ? await json<{ verified?: boolean }>(res) : null;
        if (!body?.verified) failures.push(`${r.id}: HTTP ${res.status}`);
      } catch (err) {
        failures.push(`${r.id}: ${(err as Error).message}`);
      }
    }
    results.push({
      name: 'settled rounds verify via /rounds/:id/verify',
      ok: failures.length === 0,
      detail: failures.length ? `${failures.length}/${sample.length} failed, e.g. ${failures[0]}` : `${sample.length} verified`,
    });
  }

  return results;
}

export function printReport(report: ChaosReport): void {
  const line = (s: string) => process.stdout.write(s + '\n');
  line(`\n== ${report.name} ==`);
  line(`bets: ${report.accepted} accepted, ${report.rejected} rejected, ${report.unknown} unknown (connection lost)`);
  line(`chaos: ${report.duplicatesInjected} duplicate deliveries, ${report.lateRedeliveries} late redeliveries, kills: ${report.kills.join(', ') || 'none'}`);
  for (const i of report.invariants) line(`${i.ok ? 'PASS' : 'FAIL'}  ${i.name} — ${i.detail}`);
  line(report.ok ? 'RESULT: PASS' : 'RESULT: FAIL');
}
