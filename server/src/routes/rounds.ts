import { Hono } from 'hono';
import { getRound, listRounds } from '../rounds/rounds.repo.js';
import { roundView } from './views.js';

export const rounds = new Hono().get('/:id', async (c) => c.json(roundView(await getRound(c.req.param('id')))));

export const players = new Hono().get('/:playerId/rounds', async (c) => {
  const list = await listRounds(c.req.param('playerId'));
  return c.json(list.map(roundView));
});
