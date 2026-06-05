import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      LOG_LEVEL: 'silent',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://payout:payout@localhost:54329/payout_test',
    },
    fileParallelism: false,
    testTimeout: 20000,
  },
});
