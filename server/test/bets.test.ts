import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { settleRound } from '../src/settlement/worker.js';

const app = createApp();

const post = (path: string, body: unknown) =>
  app.request(path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

beforeAll(async () => {
  await migrate(true);
});

beforeEach(async () => {
  await pool.query('TRUNCATE queue_messages, rounds, wallets');
  await post('/admin/wallets', { playerId: 'alice', balance: 10_000 });
});

afterAll(async () => {
  await pool.end();
});

describe('POST /bets', () => {
  it('debits the stake and returns a pending round', async () => {
    const res = await post('/bets', { playerId: 'alice', stake: 100 });
    expect(res.status).toBe(201);
    const round = await res.json();
    expect(round.status).toBe('PENDING');
    expect(round.stops).toHaveLength(5);

    const wallet = await (await app.request('/wallets/alice')).json();
    expect(wallet.balance).toBe(10_000 - 100);
  });

  it('rejects stakes that are not a multiple of the line count', async () => {
    const res = await post('/bets', { playerId: 'alice', stake: 105 });
    expect(res.status).toBe(400);
  });

  it('rejects bets above the balance', async () => {
    const res = await post('/bets', { playerId: 'alice', stake: 10_000 });
    expect(res.status).toBe(201);
    const second = await post('/bets', { playerId: 'alice', stake: 10 });
    expect(second.status).toBe(402);
  });
});

describe('settlement', () => {
  it('credits the win and marks the round settled', async () => {
    const round = await (await post('/bets', { playerId: 'alice', stake: 100 })).json();
    await settleRound(round.id);

    const settled = await (await app.request(`/rounds/${round.id}`)).json();
    expect(settled.status).toBe('SETTLED');
    const wallet = await (await app.request('/wallets/alice')).json();
    expect(wallet.balance).toBe(10_000 - 100 + round.win);
  });
});
