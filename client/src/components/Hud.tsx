import type { GameSnapshot } from '../game/state';

const STAKES = [10, 20, 50, 100, 200, 500];

interface HudProps {
  snapshot: GameSnapshot;
  onStake: (stake: number) => void;
  onSpin: () => void;
}

const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export function Hud({ snapshot, onStake, onSpin }: HudProps) {
  return (
    <div className="panel">
      <h2>Wallet</h2>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(snapshot.balance)}</div>
      <label>
        Stake{' '}
        <select value={snapshot.stake} onChange={(e) => onStake(Number(e.target.value))} disabled={snapshot.phase === 'spinning'}>
          {STAKES.map((s) => (
            <option key={s} value={s}>
              {fmt(s)}
            </option>
          ))}
        </select>
      </label>
      <button onClick={onSpin} disabled={snapshot.phase === 'spinning'}>
        {snapshot.phase === 'spinning' ? 'Spinning…' : 'Spin'}
      </button>
      {snapshot.phase === 'result' && <div>{snapshot.win > 0 ? `Win ${fmt(snapshot.win)}` : 'No win'}</div>}
    </div>
  );
}
