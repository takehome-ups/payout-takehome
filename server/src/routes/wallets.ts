import { Hono } from 'hono';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { badRequest } from '../lib/errors.js';
import { getWallet } from '../wallet/wallet.repo.js';

const CreateWallet = z.object({
  playerId: z.string().min(1).max(64),
  balance: z.number().int().nonnegative(),
  dailyLossLimit: z.number().int().positive().optional(),
});

export const wallets = new Hono().get('/:playerId', async (c) => {
  const wallet = await getWallet(c.req.param('playerId'));
  return c.json(wallet);
});

export const admin = new Hono().post('/wallets', async (c) => {
  const parsed = CreateWallet.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw badRequest(parsed.error.issues.map((i) => i.message).join('; '));
  const { playerId, balance, dailyLossLimit } = parsed.data;
  await pool.query(
    `INSERT INTO wallets (player_id, balance, daily_loss_limit) VALUES ($1, $2, coalesce($3, 100000000))
     ON CONFLICT (player_id) DO UPDATE SET balance = EXCLUDED.balance, daily_loss_limit = EXCLUDED.daily_loss_limit`,
    [playerId, balance, dailyLossLimit ?? null],
  );
  return c.json(await getWallet(playerId), 201);
});
