import type { Etf, EtfId, GameState, Holding } from "../types/game";

export function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

export function getHoldingValue(holding: Holding, prices: Record<EtfId, number>) {
  return holding.shares * prices[holding.etfId];
}

export function getTotalHoldingValue(holdings: Holding[], prices: Record<EtfId, number>) {
  return holdings.reduce((sum, holding) => sum + getHoldingValue(holding, prices), 0);
}

export function getTotalAsset(state: Pick<GameState, "cash" | "holdings" | "etfPrices">) {
  return state.cash + getTotalHoldingValue(state.holdings, state.etfPrices);
}

export function getDrawdown(assetHistory: { totalAsset: number }[]) {
  let peak = 0;
  let maxDrawdown = 0;

  assetHistory.forEach((point) => {
    peak = Math.max(peak, point.totalAsset);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (peak - point.totalAsset) / peak);
    }
  });

  return maxDrawdown;
}

export function getPositionRatio(state: Pick<GameState, "cash" | "holdings" | "etfPrices">) {
  const totalAsset = getTotalAsset(state);
  if (totalAsset <= 0) return 0;
  return getTotalHoldingValue(state.holdings, state.etfPrices) / totalAsset;
}

export function createInitialPrices(etfs: Etf[]) {
  return etfs.reduce(
    (prices, etf) => ({
      ...prices,
      [etf.id]: 1,
    }),
    {} as Record<EtfId, number>,
  );
}

export function buyHolding(
  holdings: Holding[],
  prices: Record<EtfId, number>,
  etfId: EtfId,
  amount: number,
) {
  const price = prices[etfId];
  const shares = amount / price;
  const existing = holdings.find((holding) => holding.etfId === etfId);

  if (existing) {
    return holdings.map((holding) =>
      holding.etfId === etfId
        ? { ...holding, shares: holding.shares + shares, cost: holding.cost + amount }
        : holding,
    );
  }

  return [...holdings, { etfId, shares, cost: amount }];
}

export function sellHolding(
  holdings: Holding[],
  prices: Record<EtfId, number>,
  etfId: EtfId,
  amount: number,
) {
  return holdings
    .map((holding) => {
      if (holding.etfId !== etfId) return holding;

      const currentValue = getHoldingValue(holding, prices);
      const sellRatio = Math.min(1, amount / currentValue);

      return {
        ...holding,
        shares: holding.shares * (1 - sellRatio),
        cost: holding.cost * (1 - sellRatio),
      };
    })
    .filter((holding) => holding.shares > 0.000001);
}
