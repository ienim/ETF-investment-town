import { getDailyMarketEvents } from "../data/events";
import type { Etf, EtfId, MonthlyReturn } from "../types/game";

function wave(month: number, speed: number, offset = 0) {
  return Math.sin((month + offset) * speed);
}

function seededNoise(month: number, seed: number, marketSeed?: number) {
  const seedMix = marketSeed === undefined ? 0 : marketSeed * 0.000000731;
  const x = Math.sin(month * 41.17 + seed * 97.13 + seedMix * (seed + 3)) * 10000;
  return x - Math.floor(x);
}

function getMarketMood(month: number, marketSeed?: number) {
  const baseMood = wave(month, 0.65, 1) * 0.005;
  if (marketSeed === undefined) return baseMood;
  const seededMood = (seededNoise(month, 101, marketSeed) - 0.5) * 0.006;
  return baseMood + seededMood;
}

function getSectorRotation(etf: Etf, month: number) {
  if (etf.id === "nasdaq") {
    if (month === 5 || month === 6) return -0.014;
    if (month >= 10) return 0.009;
  }

  if (etf.id === "newEnergy") return wave(month, 1.15, 1) * 0.009;
  if (etf.id === "chip") return wave(month, 1.05, 2) * 0.005;
  if (etf.id === "ai") return wave(month, 1.28, 0) * 0.01;
  if (etf.id === "lowAltitude") return wave(month, 1.42, 3) * 0.012;
  if (etf.id === "electricPower") return month >= 4 && month <= 5 ? 0.004 : 0;
  if (etf.id === "gold") return wave(month, 0.9, 4) * 0.006;

  return wave(month, 0.7, 2) * 0.002;
}

function getEarningsEffect(etf: Etf, month: number) {
  if (["ai", "chip", "nasdaq"].includes(etf.id) && [4, 8, 11].includes(month)) {
    return etf.id === "chip" && month === 8 ? -0.007 : 0.006;
  }

  if (etf.id === "dividend" && [3, 6].includes(month)) return 0.002;
  return 0;
}

export function generateMonthlyReturns(etfs: Etf[], month: number, marketSeed?: number): MonthlyReturn[] {
  const marketMood = getMarketMood(month, marketSeed);
  const dailyEvents = getDailyMarketEvents(month);

  return etfs.map((etf, index) => {
    const eventEffect = dailyEvents.reduce((sum, event) => {
      if (event.effects?.[etf.id] !== undefined) return sum + (event.effects[etf.id] ?? 0);
      if (event.targetEtfs.includes(etf.id)) return sum + event.effect;
      return sum;
    }, 0);
    const sectorRotation = getSectorRotation(etf, month);
    const earningsEffect = getEarningsEffect(etf, month);
    const randomNoise = (seededNoise(month, index + 1, marketSeed) - 0.5) * etf.volatility * 0.4;
    const volatility = (seededNoise(month + 5, index + 7, marketSeed) - 0.5) * etf.volatility * 0.25;

    const rawReturn =
      etf.baseTrend +
      marketMood +
      volatility +
      sectorRotation +
      eventEffect +
      earningsEffect +
      randomNoise;

    const limit = etf.highVolatility ? 0.08 : 0.045;
    const returnRate = Math.max(-limit, Math.min(limit, rawReturn));

    return {
      etfId: etf.id as EtfId,
      returnRate,
      dividend: etf.dividendYield ?? 0,
      parts: {
        baseTrend: etf.baseTrend,
        marketMood,
        volatility,
        sectorRotation,
        eventEffect,
        earningsEffect,
        randomNoise,
      },
    };
  });
}
