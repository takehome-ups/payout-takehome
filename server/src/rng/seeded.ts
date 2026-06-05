import { createHmac, randomBytes } from 'node:crypto';

export function newServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function reelStops(serverSeed: string, clientSeed: string, nonce: number, reelLengths: number[]): number[] {
  return reelLengths.map((length, reel) => {
    const digest = createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:${reel}`).digest();
    return digest.readUInt32BE(0) % length;
  });
}
