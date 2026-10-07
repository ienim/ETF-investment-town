import { etfs } from "../data/etfs";
import type { EtfId, GameState } from "../types/game";
import { formatMoney, getHoldingValue } from "../utils/portfolio";

interface HoldingListProps {
  gameState: GameState;
  onSelectEtf?: (etfId: EtfId) => void;
}

export function HoldingList({ gameState, onSelectEtf }: HoldingListProps) {
  if (gameState.holdings.length === 0) {
    return <p className="empty-text">还没有持仓。现金躺在口袋里，也是一种选择。</p>;
  }

  const totalCost = gameState.holdings.reduce((s, h) => s + h.cost, 0);
  const totalValue = gameState.holdings.reduce((s, h) => s + getHoldingValue(h, gameState.etfPrices), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="holding-list">
      {/* 总览汇总行 */}
      <div className="holding-summary-row">
        <span>
          <strong>持仓总市值</strong>
          <em>¥{formatMoney(totalValue)}</em>
        </span>
        <span className={`holding-pnl ${totalPnl >= 0 ? "up-text" : "down-text"}`}>
          <strong>{totalPnl >= 0 ? "+" : ""}{formatMoney(totalPnl)}</strong>
          <em>{totalPnl >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%</em>
        </span>
      </div>

      {/* 持仓列表 */}
      <div className="holding-rows">
        {gameState.holdings.map((holding) => {
          const etf = etfs.find((item) => item.id === holding.etfId);
          const value = getHoldingValue(holding, gameState.etfPrices);
          const pnl = value - holding.cost;
          const pnlPercent = holding.cost > 0 ? (pnl / holding.cost) * 100 : 0;
          const boughtToday = gameState.tradeRecords
            .filter((record) => record.month === gameState.month && record.etfId === holding.etfId && record.type === "buy")
            .reduce((sum, record) => sum + record.amount, 0);
          const sellableValue = Math.max(0, value - boughtToday);

          return (
            <div
              className="holding-row holding-row--detail"
              key={holding.etfId}
              onClick={() => onSelectEtf?.(holding.etfId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectEtf?.(holding.etfId); }}
            >
              <div className="holding-row__asset">
                <span className="holding-row__name">
                  {etf?.icon ?? ""} {etf?.name ?? holding.etfId}
                </span>
                <span className="holding-row__cost">
                  成本 ¥{formatMoney(holding.cost)}
                  <small>{holding.shares.toFixed(2)} 份</small>
                </span>
              </div>
              <div className="holding-row__value">
                <span className="holding-row__current">
                  ¥{formatMoney(value)}
                </span>
                <span className={`holding-row__pnl ${pnl >= 0 ? "up-text" : "down-text"}`}>
                  {pnl >= 0 ? "+" : ""}{formatMoney(pnl)}
                  <small>({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)</small>
                </span>
              </div>
              {boughtToday > 0 || sellableValue < value ? (
                <div className="holding-row__badges">
                  {boughtToday > 0 ? <span className="badge badge--today">今日 +¥{formatMoney(boughtToday)}</span> : null}
                  {sellableValue < value ? <span className="badge badge--lock">部分不可卖</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
