import { pool } from '../db/pool.js';
import { log, setProc } from '../lib/log.js';
import { runWorker } from './worker.js';

const controller = new AbortController();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => controller.abort());
}

setProc('worker');
log('worker.started');
runWorker(controller.signal)
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
