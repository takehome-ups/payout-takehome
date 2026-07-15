export interface LineWin {
  line: number;
  symbol: string;
  count: number;
  multiplier: number;
}

export interface RoundView {
  id: string;
  playerId: string;
  stake: number;
  win: number;
  status: 'PENDING' | 'SETTLING' | 'SETTLED';
  stops: number[];
  grid: string[][];
  lineWins: LineWin[];
}

export interface Wallet {
  playerId: string;
  balance: number;
}

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'content-type': 'application/json' }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  placeBet: (playerId: string, stake: number) =>
    request<RoundView>('/bets', { method: 'POST', body: JSON.stringify({ playerId, stake }) }),
  getRound: (id: string) => request<RoundView>(`/rounds/${id}`),
  getWallet: (playerId: string) => request<Wallet>(`/wallets/${playerId}`),
  verifyRound: (id: string) => request<Record<string, unknown>>(`/rounds/${id}/verify`),
};
