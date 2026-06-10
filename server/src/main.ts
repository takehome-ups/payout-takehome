import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { env } from './config.js';
import { log } from './lib/log.js';

serve({ fetch: createApp().fetch, port: env.port }, (info) => log('api.started', { port: info.port }));
