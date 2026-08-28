import { env } from '../config.js';
import { log } from '../lib/log.js';
import { ack, receive, type Message } from '../queue/pg-queue.js';
import { SETTLE_TOPIC } from '../rounds/bet.service.js';
import { getRound, setStatus } from '../rounds/rounds.repo.js';
import { credit } from '../wallet/wallet.repo.js';
import { publishRoundEvent } from './notify.js';

interface SettlePayload {
  roundId: string;
}

export async function settleRound(roundId: string): Promise<void> {
  const round = await getRound(roundId);
  await setStatus(round.id, 'SETTLING');
  await publishRoundEvent({ type: 'round.settling', roundId: round.id, playerId: round.playerId });

  if (round.win > 0) {
    await credit(round.playerId, round.win, round.id);
  }

  await setStatus(round.id, 'SETTLED');
  await publishRoundEvent({ type: 'round.settled', roundId: round.id, playerId: round.playerId, win: round.win });
  log('round.settled', { round_id: round.id, player_id: round.playerId, win: round.win });
}

export async function handle(message: Message<SettlePayload>): Promise<void> {
  log('settlement.delivered', { message_id: message.id, round_id: message.payload.roundId, attempt: message.attempts });
  await settleRound(message.payload.roundId);
  await ack(message.id);
  log('queue.ack', { message_id: message.id });
}

export async function runWorker(signal: AbortSignal): Promise<void> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const stats = { inflight: 0, processed: 0 };
  const heartbeat = setInterval(() => log('worker.heartbeat', stats), 10_000);
  signal.addEventListener('abort', () => clearInterval(heartbeat));

  const loop = async () => {
    while (!signal.aborted) {
      const message = await receive<SettlePayload>(SETTLE_TOPIC);
      if (!message) {
        await sleep(env.workerPollMs);
        continue;
      }
      stats.inflight += 1;
      try {
        await handle(message);
        stats.processed += 1;
      } catch (err) {
        log('settlement.error', { message_id: message.id, error: (err as Error).message });
      } finally {
        stats.inflight -= 1;
      }
    }
  };

  await Promise.all(Array.from({ length: env.workerConcurrency }, loop));
}
