import { pool } from '../db/pool.js';

export const ROUND_CHANNEL = 'round_events';

export async function publishRoundEvent(event: Record<string, unknown>): Promise<void> {
  await pool.query('SELECT pg_notify($1, $2)', [ROUND_CHANNEL, JSON.stringify(event)]);
}
