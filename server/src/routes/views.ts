import { settleStops } from '../rounds/engine.js';
import type { Round } from '../rounds/rounds.repo.js';

export function roundView(round: Round) {
  const { grid, lineWins } = settleStops(round.stops, round.stake);
  return {
    id: round.id,
    playerId: round.playerId,
    stake: round.stake,
    win: round.win,
    status: round.status,
    stops: round.stops,
    grid,
    lineWins,
    clientSeed: round.clientSeed,
    nonce: round.nonce,
    createdAt: round.createdAt,
    settledAt: round.settledAt,
  };
}
