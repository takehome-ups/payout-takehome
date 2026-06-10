import { pool } from '../db/pool.js';
import { lossLimitReached } from '../lib/errors.js';

export async function assertWithinLossLimit(playerId: string, stake: number, limit: number): Promise<void> {
  const { rows } = await pool.query(
    `SELECT coalesce(sum(stake - win), 0) AS net_loss
       FROM rounds
      WHERE player_id = $1 AND created_at > now() - interval '24 hours'`,
    [playerId],
  );
  if (rows[0].net_loss + stake > limit) throw lossLimitReached();
}
