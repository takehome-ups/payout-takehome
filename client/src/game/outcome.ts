import reels from '../../../config/reels.json';

export function previewGrid(): string[][] {
  return reels.strips.map((strip) => {
    const stop = Math.floor(Math.random() * strip.length);
    return Array.from({ length: reels.rows }, (_, row) => strip[(stop + row) % strip.length]);
  });
}
