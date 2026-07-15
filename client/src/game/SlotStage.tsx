import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { playWinSound } from '../audio';
import { PlaceholderAnimator, type CharacterAnimator } from './animator';
import { ReelView } from './ReelView';
import { loadSpineAnimator } from './spineAnimator';
import { gameState, type GameSnapshot } from './state';

const WIDTH = 900;
const HEIGHT = 540;
const CELL = 140;

export interface StageHandle {
  reels: ReelView;
  animator: CharacterAnimator;
}

interface SlotStageProps {
  onReady: (handle: StageHandle) => void;
}

export function SlotStage({ onReady }: SlotStageProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const app = new Application();
    let disposed = false;

    (async () => {
      await app.init({ width: WIDTH, height: HEIGHT, background: 0x161a23, antialias: true });
      if (disposed) return;
      host.current?.appendChild(app.canvas);
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';

      const reels = new ReelView(CELL);
      reels.position.set(40, (HEIGHT - CELL * 3) / 2);
      app.stage.addChild(reels);

      const animator = (await loadSpineAnimator()) ?? new PlaceholderAnimator(70);
      animator.view.position.set(WIDTH - 90, HEIGHT / 2);
      app.stage.addChild(animator.view);

      app.ticker.add(reels.update);
      app.ticker.add((t) => animator.update(t));

      gameState.addListener('win', (s: GameSnapshot) => playWinSound(s.win >= s.stake * 20));

      onReady({ reels, animator });
    })();

    return () => {
      disposed = true;
      app.canvas?.remove();
    };
  }, [onReady]);

  return <div className="stage" ref={host} />;
}
