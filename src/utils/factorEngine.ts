import { getDailyMarketEvents } from "../data/events";
import type { Etf, EtfId, GameState } from "../types/game";

export interface FactorScore {
  etfId: EtfId;
  macro: number;
  technical: number;
  fundFlow: number;
  sentiment: number;
  probability: number;
  comment: string;
}

function clampScore(value: number) {
  return Math.max(5, Math.min(95, Math.round(value)));
}

function getMomentumScore(history: { value: number }[]) {
  if (history.length < 2) return 50;

  const last = history.at(-1)?.value ?? 1;
  const prev = history.at(-2)?.value ?? last;
  const first = history[Math.max(0, history.length - 4)]?.value ?? prev;
  const shortMomentum = last / Math.max(0.01, prev) - 1;
  const mediumMomentum = last / Math.max(0.01, first) - 1;

  return clampScore(50 + shortMomentum * 900 + mediumMomentum * 450);
}

function getEventEffect(etfId: EtfId, day: number) {
  return getDailyMarketEvents(day).reduce((sum, event) => {
    if (event.effects?.[etfId] !== undefined) return sum + (event.effects[etfId] ?? 0);
    if (event.targetEtfs.includes(etfId)) return sum + event.effect;
    return sum;
  }, 0);
}

function getSentimentBase(etf: Etf, eventEffect: number) {
  const hotThemeBonus = etf.highVolatility ? 10 : 0;
  const eventBonus = eventEffect * 420;
  return clampScore(48 + hotThemeBonus + eventBonus);
}

function getFundFlowScore(etf: Etf, day: number, eventEffect: number) {
  const defensiveBonus = ["dividend", "electricPower", "csi300"].includes(etf.id) ? 4 : 0;
  const rotation = Math.sin(day * 0.87 + etf.volatility * 100) * 9;
  return clampScore(50 + defensiveBonus + eventEffect * 360 + rotation);
}

function createFactorComment(score: Omit<FactorScore, "comment">) {
  const strongest = [
    ["宏观", score.macro],
    ["技术", score.technical],
    ["资金", score.fundFlow],
    ["情绪", score.sentiment],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];

  if (score.probability >= 76) {
    if (score.technical >= 70 && score.sentiment >= 70) {
      return "走势和热度都偏强，容易继续冲，也容易突然抖。";
    }

    return `${strongest}在带节奏，当前偏强，但仓位别跟着情绪一起放大。`;
  }

  if (score.probability <= 38) {
    if (score.technical <= 42) {
      return "走势偏弱，别急着把反弹想成反转。";
    }

    return `${strongest}还不够撑住全局，先观察比急着抄底更稳。`;
  }

  if (score.macro >= 68 && score.technical <= 48) {
    return "基本逻辑不差，但走势还没完全跟上，适合观察确认。";
  }

  if (score.technical >= 65 && score.sentiment <= 48) {
    return "走势先走出来了，情绪还没完全跟上，适合看持续性。";
  }

  return "中性偏观察，真正重要的是它在你组合里占多少。";
}

export function generateFactorScores(etfs: Etf[], gameState: GameState): FactorScore[] {
  return etfs.map((etf) => {
    const eventEffect = getEventEffect(etf.id, gameState.month);
    const macro = clampScore(50 + etf.baseTrend * 1100 + eventEffect * 480);
    const technical = getMomentumScore(gameState.priceHistory[etf.id] ?? []);
    const fundFlow = getFundFlowScore(etf, gameState.month, eventEffect);
    const sentiment = getSentimentBase(etf, eventEffect);
    const probability = clampScore(macro * 0.3 + technical * 0.3 + fundFlow * 0.2 + sentiment * 0.2);

    return {
      etfId: etf.id,
      macro,
      technical,
      fundFlow,
      sentiment,
      probability,
      comment: createFactorComment({
        etfId: etf.id,
        macro,
        technical,
        fundFlow,
        sentiment,
        probability,
      }),
    };
  });
}
