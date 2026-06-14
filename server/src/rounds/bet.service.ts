import { randomUUID } from 'node:crypto';
import { paytable } from '../game/config.js';
import { badRequest } from '../lib/errors.js';
import { log } from '../lib/log.js';
import { enqueue } from '../queue/pg-queue.js';
import { newServerSeed } from '../rng/seeded.js';
import { debit } from '../wallet/wallet.repo.js';
import { spin } from './engine.js';
import { insertRound, nextNonce, type Round } from './rounds.repo.js';

export const MIN_STAKE = 10;
export const MAX_STAKE = 10_000;
export const SETTLE_TOPIC = 'round.settle';

export interface BetInput {
  playerId: string;
  stake: number;
  clientSeed?: string;
}

export function validateStake(stake: number): void {
  if (!Number.isInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    throw badRequest(`stake must be an integer between ${MIN_STAKE} and ${MAX_STAKE}`);
  }
  if (stake % paytable.lines !== 0) {
    throw badRequest(`stake must be a multiple of ${paytable.lines}`);
  }
}

export async function placeBet({ playerId, stake, clientSeed = 'default' }: BetInput): Promise<Round> {
  validateStake(stake);
  const id = randomUUID();
  log('bet.received', { player_id: playerId, round_id: id, stake });

  await debit(playerId, stake, id);

  const serverSeed = newServerSeed();
  const nonce = await nextNonce(playerId);
  const result = spin(serverSeed, clientSeed, nonce, stake);
  const round = await insertRound({ id, playerId, stake, clientSeed, nonce, serverSeed, stops: result.stops, win: result.win });
  log('round.outcome', { player_id: playerId, round_id: id, stake, stops: result.stops, win: result.win, line_wins: result.lineWins });

  const messageId = await enqueue(SETTLE_TOPIC, { roundId: id });
  log('settlement.enqueued', { round_id: id, message_id: messageId });
  return round;
}
