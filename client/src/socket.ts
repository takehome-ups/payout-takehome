export interface RoundEvent {
  type: 'round.settling' | 'round.settled';
  roundId: string;
  playerId: string;
  win?: number;
}

export function connectRoundEvents(playerId: string, onEvent: (e: RoundEvent) => void): () => void {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?playerId=${encodeURIComponent(playerId)}`);
  ws.onmessage = (msg) => onEvent(JSON.parse(msg.data));
  return () => ws.close();
}
