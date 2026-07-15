import { Container, Graphics, type Ticker } from 'pixi.js';

export interface CharacterAnimator {
  readonly view: Container;
  idle(): void;
  anticipation(): void;
  result(win: number, stake: number): void;
  update(ticker: Ticker): void;
  destroy(): void;
}

export const BIG_WIN_MULTIPLIER = 20;

type Mode = 'idle' | 'anticipation' | 'win' | 'bigwin' | 'lose';

export class PlaceholderAnimator implements CharacterAnimator {
  readonly view = new Container();
  private orb = new Graphics();
  private mode: Mode = 'idle';
  private t = 0;

  constructor(private radius: number) {
    this.view.addChild(this.orb);
    this.draw(0x3b82f6, 1);
  }

  idle(): void {
    this.mode = 'idle';
  }

  anticipation(): void {
    this.mode = 'anticipation';
  }

  result(win: number, stake: number): void {
    this.mode = win <= 0 ? 'lose' : win >= stake * BIG_WIN_MULTIPLIER ? 'bigwin' : 'win';
    this.t = 0;
  }

  update(ticker: Ticker): void {
    this.t += ticker.deltaMS / 1000;
    const pulse = (speed: number, amount: number) => 1 + Math.sin(this.t * speed) * amount;
    switch (this.mode) {
      case 'idle':
        return this.draw(0x3b82f6, pulse(2, 0.04));
      case 'anticipation':
        return this.draw(0xf59e0b, pulse(14, 0.12));
      case 'win':
        return this.draw(0x22c55e, pulse(6, 0.2));
      case 'bigwin':
        return this.draw(0xf5b301, 1.3 + Math.sin(this.t * 10) * 0.3);
      case 'lose':
        return this.draw(0x6b7280, 0.9);
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }

  private draw(color: number, scale: number): void {
    this.orb.clear().circle(0, 0, this.radius * scale).fill({ color, alpha: 0.9 });
  }
}
