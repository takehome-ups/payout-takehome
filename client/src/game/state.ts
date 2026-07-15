export type Phase = 'idle' | 'spinning' | 'result';

export interface GameSnapshot {
  phase: Phase;
  balance: number;
  stake: number;
  grid: string[][] | null;
  win: number;
  roundId: string | null;
}

type Listener = (snapshot: GameSnapshot) => void;
type EventName = 'change' | 'win';

export class GameState {
  private snapshot: GameSnapshot = { phase: 'idle', balance: 0, stake: 100, grid: null, win: 0, roundId: null };
  private listeners: Record<EventName, Set<Listener>> = { change: new Set(), win: new Set() };

  get(): GameSnapshot {
    return this.snapshot;
  }

  update(patch: Partial<GameSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit('change');
    if (patch.phase === 'result' && this.snapshot.win > 0) this.emit('win');
  }

  addListener(event: EventName, fn: Listener): void {
    this.listeners[event].add(fn);
  }

  removeListener(event: EventName, fn: Listener): void {
    this.listeners[event].delete(fn);
  }

  private emit(event: EventName): void {
    for (const fn of this.listeners[event]) fn(this.snapshot);
  }
}

export const gameState = new GameState();
