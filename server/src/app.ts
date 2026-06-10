import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DomainError } from './lib/errors.js';
import { log } from './lib/log.js';
import { bets } from './routes/bets.js';
import { players, rounds } from './routes/rounds.js';
import { admin, wallets } from './routes/wallets.js';

export function createApp() {
  const app = new Hono();
  app.use('*', cors());

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/bets', bets);
  app.route('/rounds', rounds);
  app.route('/players', players);
  app.route('/wallets', wallets);
  app.route('/admin', admin);

  app.onError((err, c) => {
    if (err instanceof DomainError) {
      return c.json({ error: err.code, message: err.message }, err.status as 400);
    }
    log('http.error', { path: c.req.path, error: err.message });
    return c.json({ error: 'INTERNAL', message: 'internal error' }, 500);
  });

  return app;
}
