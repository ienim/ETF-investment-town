import type { Etf, GameState } from "../types/game";
import type { FactorScore } from "../utils/factorEngine";
import { formatMoney } from "../utils/portfolio";
import { LineTrendChart } from "./LineTrendChart";
import { PixelButton } from "./PixelButton";

interface EtfDetailModalProps {
  etf: Etf;
  price: number;
  factorScore?: FactorScore;
  showTrend: boolean;
  priceHistory?: { month: number; value: number }[];
  onClose: () => void;
}

export function EtfDetailModal({ etf, price, factorScore, showTrend, priceHistory, onClose }: EtfDetailModalProps) {
  return (
    <div className="modal-backdrop etf-detail-backdrop">
      <div className="modal-card etf-detail-card">
        <div className="compact-header">
          <div>
            <p className="eyebrow">图鉴详情</p>
            <h2>{etf.icon} {etf.name}</h2>
          </div>
          <PixelButton variant="secondary" onClick={onClose}>返回</PixelButton>
        </div>

        <div className="etf-detail-body">
          {/* 基本信息行 */}
          <div className="etf-detail-meta">
            <span className="etf-detail-badge etf-detail-badge--category">{etf.category}</span>
            <span className="etf-detail-badge etf-detail-badge--risk">风险：{etf.risk}</span>
            {etf.dividendYield ? (
              <span className="etf-detail-badge etf-detail-badge--div">分红 {(etf.dividendYield * 100).toFixed(1)}%</span>
            ) : null}
            {etf.monthlyBuyLimit ? (
              <span className="etf-detail-badge etf-detail-badge--limit">月限 ¥{formatMoney(etf.monthlyBuyLimit)}</span>
            ) : null}
          </div>

          {/* 价格 */}
          <div className="etf-detail-price">
            <span>当前净值</span>
            <strong>¥{formatMoney(price * 1000)} / 1000份</strong>
          </div>

          {/* 简介 */}
          <div className="etf-detail-section">
            <p className="etf-detail-style">{etf.style}</p>
            <p className="etf-detail-feature">{etf.feature}</p>
          </div>

          {/* 走势图 */}
          <div className="etf-detail-section">
            <strong className="etf-detail-section-title">净值走势</strong>
            {showTrend && priceHistory && priceHistory.length > 0 ? (
              <div className="mini-chart-card etf-detail-chart">
                <LineTrendChart
                  color="#4f8c74"
                  data={priceHistory.map((point) => ({
                    day: `D${point.month}`,
                    value: Number(point.value.toFixed(3)),
                  }))}
                  height={120}
                  xKey="day"
                  yKey="value"
                  valueFormatter={(value) => Number(value).toFixed(3)}
                />
              </div>
            ) : (
              <div className="etf-detail-unlock">
                <span>🔒 第2天开放走势观察</span>
                <p>第1天先熟悉基础信息和因子强弱，走势数据会在第2天解锁。</p>
              </div>
            )}
          </div>

          {/* 因子 */}
          {factorScore ? (
            <div className="etf-detail-section">
              <strong className="etf-detail-section-title">因子评分</strong>
              <FactorMiniPanel score={factorScore} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FactorMiniPanel({ score }: { score: FactorScore }) {
  return (
    <div className="factor-mini-panel">
      <div className="factor-mini-head">
        <strong>综合强弱 {score.probability}%</strong>
        <span>{score.comment}</span>
      </div>
      <div className="factor-lines">
        <FactorLine label="宏观" value={score.macro} />
        <FactorLine label="技术" value={score.technical} />
        <FactorLine label="资金" value={score.fundFlow} />
        <FactorLine label="情绪" value={score.sentiment} />
      </div>
    </div>
  );
}

function FactorLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="factor-line">
      <span>{label}</span>
      <i style={{ width: `${value}%` }} />
      <strong>{value}</strong>
    </div>
  );
}
