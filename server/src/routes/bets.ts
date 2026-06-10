import { Hono } from 'hono';
import { z } from 'zod';
import { badRequest } from '../lib/errors.js';
import { placeBet } from '../rounds/bet.service.js';
import { roundView } from './views.js';

const BetBody = z.object({
  playerId: z.string().min(1).max(64),
  stake: z.number().int(),
  clientSeed: z.string().min(1).max(64).optional(),
});

export const bets = new Hono().post('/', async (c) => {
  const parsed = BetBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw badRequest(parsed.error.issues.map((i) => i.message).join('; '));
  const round = await placeBet(parsed.data);
  return c.json(roundView(round), 201);
});
