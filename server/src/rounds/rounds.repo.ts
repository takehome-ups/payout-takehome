import { pool } from '../db/pool.js';
import { notFound } from '../lib/errors.js';

export type RoundStatus = 'PENDING' | 'SETTLING' | 'SETTLED';

export interface Round {
  id: string;
  playerId: string;
  stake: number;
  clientSeed: string;
  nonce: number;
  serverSeed: string;
  stops: number[];
  win: number;
  status: RoundStatus;
  createdAt: Date;
  settledAt: Date | null;
}

const toRound = (r: any): Round => ({
  id: r.id,
  playerId: r.player_id,
  stake: r.stake,
  clientSeed: r.client_seed,
  nonce: r.nonce,
  serverSeed: r.server_seed,
  stops: r.stops,
  win: r.win,
  status: r.status,
  createdAt: r.created_at,
  settledAt: r.settled_at,
});

export async function nextNonce(playerId: string): Promise<number> {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM rounds WHERE player_id = $1', [playerId]);
  return rows[0].n;
}

export async function insertRound(input: Omit<Round, 'status' | 'createdAt' | 'settledAt'>): Promise<Round> {
  const { rows } = await pool.query(
    `INSERT INTO rounds (id, player_id, stake, client_seed, nonce, server_seed, stops, win)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [input.id, input.playerId, input.stake, input.clientSeed, input.nonce, input.serverSeed, input.stops, input.win],
  );
  return toRound(rows[0]);
}

export async function getRound(id: string): Promise<Round> {
  const { rows } = await pool.query('SELECT * FROM rounds WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('round');
  return toRound(rows[0]);
}

export async function listRounds(playerId: string): Promise<Round[]> {
  const { rows } = await pool.query('SELECT * FROM rounds WHERE player_id = $1 ORDER BY created_at', [playerId]);
  return rows.map(toRound);
}

export async function setStatus(id: string, status: RoundStatus): Promise<void> {
  await pool.query(
    `UPDATE rounds SET status = $2, settled_at = CASE WHEN $2 = 'SETTLED' THEN now() ELSE settled_at END WHERE id = $1`,
    [id, status],
  );
}
