/** Small deterministic PRNG; no platform-dependent random source is used. */
export class SeededRandom {
  private state: number;

  constructor(seed: string) {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    this.state = hash >>> 0 || 0x9e3779b9;
  }

  next(): number {
    let state = this.state;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state = state >>> 0;
    return this.state / 0x100000000;
  }

  integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('maxExclusive must be a positive integer');
    }
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }
}
