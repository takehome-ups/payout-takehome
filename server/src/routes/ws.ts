import type { Hono } from 'hono';
import { createNodeWebSocket } from '@hono/node-ws';
import type { WSContext } from 'hono/ws';
import pg from 'pg';
import { env } from '../config.js';
import { ROUND_CHANNEL } from '../settlement/notify.js';

export function attachRoundEvents(app: Hono) {
  const nodeWs = createNodeWebSocket({ app });
  const subscribers = new Map<string, Set<WSContext>>();

  const listener = new pg.Client({ connectionString: env.databaseUrl });
  listener.connect().then(() => listener.query(`LISTEN ${ROUND_CHANNEL}`));
  listener.on('notification', (n) => {
    if (!n.payload) return;
    const event = JSON.parse(n.payload);
    for (const ws of subscribers.get(event.playerId) ?? []) ws.send(n.payload);
  });

  app.get(
    '/ws',
    nodeWs.upgradeWebSocket((c) => {
      const playerId = c.req.query('playerId') ?? '';
      return {
        onOpen: (_evt, ws) => {
          const set = subscribers.get(playerId) ?? new Set();
          set.add(ws);
          subscribers.set(playerId, set);
        },
        onClose: (_evt, ws) => {
          subscribers.get(playerId)?.delete(ws);
        },
      };
    }),
  );

  return nodeWs;
}
