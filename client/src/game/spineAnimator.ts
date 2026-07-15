import { Assets, Container, type Ticker } from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { BIG_WIN_MULTIPLIER, type CharacterAnimator } from './animator';

export const SPINE_ASSETS = {
  skeleton: { alias: 'characterSkeleton', src: '/spine/character.skel' },
  atlas: { alias: 'characterAtlas', src: '/spine/character.atlas' },
};

export async function loadSpineAnimator(): Promise<CharacterAnimator | null> {
  try {
    if (!Assets.cache.has(SPINE_ASSETS.skeleton.alias)) {
      Assets.add(SPINE_ASSETS.skeleton);
      Assets.add(SPINE_ASSETS.atlas);
    }
    await Assets.load([SPINE_ASSETS.skeleton.alias, SPINE_ASSETS.atlas.alias]);
    return new SpineAnimator(Spine.from({ skeleton: SPINE_ASSETS.skeleton.alias, atlas: SPINE_ASSETS.atlas.alias }));
  } catch {
    return null;
  }
}

class SpineAnimator implements CharacterAnimator {
  readonly view = new Container();

  constructor(private spine: Spine) {
    this.view.addChild(spine);
    this.idle();
  }

  idle(): void {
    this.spine.state.setAnimation(0, 'idle', true);
  }

  anticipation(): void {
    this.spine.state.setAnimation(0, 'anticipation', true);
  }

  result(win: number, stake: number): void {
    const name = win <= 0 ? 'lose' : win >= stake * BIG_WIN_MULTIPLIER ? 'bigwin' : 'win';
    this.spine.state.setAnimation(0, name, false);
    this.spine.state.addAnimation(0, 'idle', true, 0);
  }

  update(_ticker: Ticker): void {}

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
