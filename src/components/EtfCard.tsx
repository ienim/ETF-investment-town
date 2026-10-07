import type { Etf } from "../types/game";
import { formatMoney } from "../utils/portfolio";

interface EtfCardProps {
  etf: Etf;
  price: number;
}

export function EtfCard({ etf, price }: EtfCardProps) {
  return (
    <article className="etf-card">
      <div className="etf-card__icon">{etf.icon}</div>
      <div>
        <div className="etf-card__title">
          <h3>{etf.name}</h3>
          <span>{etf.risk}</span>
        </div>
        <p>{etf.category}</p>
        <p className="muted">风格：{etf.style}</p>
        <p className="muted">特点：{etf.feature}</p>
        <strong>当前净值 ¥{formatMoney(price * 1000)} / 1000份</strong>
      </div>
    </article>
  );
}
