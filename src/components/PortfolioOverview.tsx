import type { GameState, Etf } from "../types/game";
import { LineTrendChart } from "./LineTrendChart";
import { formatMoney, formatPercent } from "../utils/portfolio";
export function PortfolioOverview({gameState, etfs}: {gameState: GameState; etfs: Etf[]}) {
  const holdings = gameState.holdings.filter(h => h.shares > 0);
  return <section className="garden-holdings" aria-label="持仓走势"><header><h2>我的持仓</h2><span>{holdings.length} 只 ETF</span></header>
    {!holdings.length && <p>还没有持仓。买入后，这里会显示实际行情走势。</p>}
    {holdings.map(h => {const price=gameState.etfPrices[h.etfId]; const history=gameState.priceHistory[h.etfId] ?? []; const change=h.cost>0?(price*h.shares-h.cost)/h.cost:0; return <article key={h.etfId}>
      <header><strong>{etfs.find(e=>e.id===h.etfId)?.name ?? h.etfId}</strong><b>¥{formatMoney(price*h.shares)}</b></header>
      <p>{h.shares.toFixed(0)} 份 · 持仓收益 {formatPercent(change)}</p>
      {history.length > 1 ? <LineTrendChart data={history.map(p=>({day:`D${p.month}`,value:p.value}))} xKey="day" yKey="value" height={110} color={change>=0?'#46846a':'#b75945'} valueFormatter={v=>Number(v).toFixed(3)} yTickFormatter={v=>Number(v).toFixed(2)} /> : <p>等待首次收盘更新行情 · 当前净值 {price.toFixed(3)}</p>}
    </article>})}<small>价格在收盘结算时更新，非实时行情。</small></section>;
}
