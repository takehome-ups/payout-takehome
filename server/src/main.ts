import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config.js';
import { log } from './lib/log.js';
import { attachRoundEvents } from './routes/ws.js';

const app = createApp();
const { injectWebSocket } = attachRoundEvents(app);

const server = serve({ fetch: app.fetch, port: env.port }, (info) => log('api.started', { port: info.port }));
injectWebSocket(server);
