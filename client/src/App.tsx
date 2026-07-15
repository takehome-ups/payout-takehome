import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { api } from './api';
import { Hud } from './components/Hud';
import { VerifyPanel } from './components/VerifyPanel';
import { previewGrid } from './game/outcome';
import { SlotStage, type StageHandle } from './game/SlotStage';
import { gameState } from './game/state';
import { connectRoundEvents, type RoundEvent } from './socket';

const PLAYER_ID = new URLSearchParams(location.search).get('player') ?? 'demo-player';

const subscribe = (fn: () => void) => {
  gameState.addListener('change', fn);
  return () => gameState.removeListener('change', fn);
};

export function App() {
  const snapshot = useSyncExternalStore(subscribe, () => gameState.get());
  const stage = useRef<StageHandle | null>(null);
  const [events, setEvents] = useState<RoundEvent[]>([]);
  const [showStage, setShowStage] = useState(true);

  useEffect(() => {
    api.getWallet(PLAYER_ID).then((w) => gameState.update({ balance: w.balance })).catch(() => undefined);
    return connectRoundEvents(PLAYER_ID, (e) => setEvents((prev) => [e, ...prev].slice(0, 8)));
  }, []);

  const onReady = useCallback((handle: StageHandle) => {
    stage.current = handle;
  }, []);

  const spin = async () => {
    const { stake } = gameState.get();
    const handle = stage.current;
    gameState.update({ phase: 'spinning', win: 0 });
    handle?.animator.anticipation();

    const landing = handle?.reels.spinTo(previewGrid());
    try {
      const round = await api.placeBet(PLAYER_ID, stake);
      await landing;
      handle?.animator.result(round.win, stake);
      gameState.update({ phase: 'result', win: round.win, grid: round.grid, roundId: round.id });
      const wallet = await api.getWallet(PLAYER_ID);
      gameState.update({ balance: wallet.balance });
    } catch {
      handle?.animator.idle();
      gameState.update({ phase: 'idle' });
    }
  };

  return (
    <div className="layout">
      <div>
        {showStage && <SlotStage onReady={onReady} />}
        <button style={{ marginTop: 8 }} onClick={() => setShowStage((s) => !s)}>
          {showStage ? 'Unmount stage' : 'Mount stage'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Hud snapshot={snapshot} onStake={(stake) => gameState.update({ stake })} onSpin={spin} />
        <VerifyPanel roundId={snapshot.roundId} />
        <div className="panel">
          <h2>Round events</h2>
          {events.map((e, i) => (
            <code key={i}>
              {e.type} {e.roundId.slice(0, 8)} {e.win !== undefined ? `win=${e.win}` : ''}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
