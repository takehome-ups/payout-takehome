import { Container, Graphics, Text, type Ticker } from 'pixi.js';
import reels from '../../../config/reels.json';
import { SYMBOL_COLORS } from './symbols';

const COLS = 5;
const ROWS = 3;

interface Cell {
  box: Graphics;
  label: Text;
}

export class ReelView extends Container {
  private cells: Cell[][] = [];
  private spinning = false;
  private elapsed = 0;
  private durationMs = 900;
  private target: string[][] | null = null;
  private resolveStop: (() => void) | null = null;

  constructor(private cellSize: number) {
    super();
    for (let c = 0; c < COLS; c++) {
      const column: Cell[] = [];
      for (let r = 0; r < ROWS; r++) {
        const box = new Graphics();
        const label = new Text({ text: '', style: { fill: 0xffffff, fontSize: cellSize * 0.3, fontWeight: '700' } });
        label.anchor.set(0.5);
        label.position.set(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
        this.addChild(box, label);
        column.push({ box, label });
      }
      this.cells.push(column);
    }
    this.show(reels.strips.map((s) => s.slice(0, ROWS)));
  }

  show(grid: string[][]): void {
    grid.forEach((column, c) =>
      column.forEach((symbol, r) => {
        const { box, label } = this.cells[c][r];
        const pad = this.cellSize * 0.06;
        box.clear()
          .roundRect(c * this.cellSize + pad, r * this.cellSize + pad, this.cellSize - pad * 2, this.cellSize - pad * 2, 10)
          .fill(SYMBOL_COLORS[symbol] ?? 0x222222);
        label.text = symbol;
      }),
    );
  }

  spinTo(grid: string[][], durationMs = 900): Promise<void> {
    this.spinning = true;
    this.elapsed = 0;
    this.target = grid;
    this.durationMs = durationMs;
    return new Promise((resolve) => {
      this.resolveStop = () => {
        this.spinning = false;
        this.show(grid);
        resolve();
      };
    });
  }

  update = (ticker: Ticker): void => {
    if (!this.spinning) return;
    this.elapsed += ticker.deltaMS;
    if (this.elapsed >= this.durationMs && this.target) {
      this.resolveStop?.();
      return;
    }
    this.show(
      reels.strips.map((strip) => {
        const stop = Math.floor((this.elapsed / 40 + Math.random() * strip.length) % strip.length);
        return Array.from({ length: ROWS }, (_, r) => strip[(stop + r) % strip.length]);
      }),
    );
  };
}
