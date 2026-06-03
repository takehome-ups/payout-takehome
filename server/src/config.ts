export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://payout:payout@localhost:54329/payout',
  port: Number(process.env.PORT ?? 3000),
  pod: process.env.POD ?? 'pod-a',
  visibilityTimeoutMs: Number(process.env.QUEUE_VISIBILITY_TIMEOUT_MS ?? 5000),
  workerPollMs: Number(process.env.WORKER_POLL_MS ?? 50),
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 4),
};
