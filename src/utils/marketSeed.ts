import type { Difficulty } from "../types/gameplay";

const MAX_UINT32 = 0xffffffff;

export function createMarketSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] || Math.floor(Math.random() * MAX_UINT32) || 1;
  }

  return Math.floor(Math.random() * MAX_UINT32) || Date.now() >>> 0 || 1;
}

export function ensureMarketSeed(seed: number | undefined, difficulty: Difficulty) {
  if (difficulty !== "advanced") return seed;
  return seed && Number.isFinite(seed) ? seed : createMarketSeed();
}
