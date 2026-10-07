import { type ReactNode, useMemo, useState } from "react";
import happyCat1 from "../assets/optimized/cat-happy-1.webp";
import happyCat2 from "../assets/optimized/cat-happy-1.webp";
import sadCat1 from "../assets/optimized/cat-sad-1.webp";
import sadCat2 from "../assets/optimized/cat-sad-1.webp";
import { LineTrendChart } from "../components/LineTrendChart";
import { PixelButton } from "../components/PixelButton";
import { TOTAL_MONTHS } from "../data/config";
import { etfs } from "../data/etfs";
import { getDailyMarketEvents } from "../data/events";
import type { GameState } from "../types/game";
import { formatMoney, formatPercent } from "../utils/portfolio";

interface MonthResultScreenProps {
  gameState: GameState;
  onNextMonth: () => void;
  onEndGame: () => void;
}

type ResultModal = "overview" | "life" | "notes" | "returns" | null;

const happyCats = [happyCat1, happyCat2];
const sadCats = [sadCat1, sadCat2];

export function MonthResultScreen({ gameState, onNextMonth, onEndGame }: MonthResultScreenProps) {
  const result = gameState.lastMonthResult;
  const [resultModal, setResultModal] = useState<ResultModal>(null);
  const [dismissedGuide, setDismissedGuide] = useState(false);

  if (!result) {
    return (
      <main className="screen fit-screen">
        <section className="game-frame centered-frame">
          <h1>本交易日结算</h1>
          <PixelButton onClick={onNextMonth}>返回</PixelButton>
        </section>
      </main>
    );
  }

  const isFinal = Boolean(gameState.gameOverReason) || result.month >= TOTAL_MONTHS;
  const tutorialLocked = !gameState.gameOverReason && result.month <= 2;
  const lifeActionCount = result.lifeActions?.length ?? 0;
  const lifeCash =
    (result.lifeEvent?.cashChange ?? 0) +
    (result.lifeActions?.reduce((sum, item) => sum + item.cashChange, 0) ?? 0);

  const catPool = result.monthlyProfit >= 0 ? happyCats : sadCats;
  const selectedCat = catPool[(result.month + Math.abs(Math.round(result.monthlyProfit))) % catPool.length];

  const dailyChangeChartData = gameState.assetHistory.map((item, index, list) => ({
    day: `D${item.month}`,
    delta: Math.round(index === 0 ? 0 : item.totalAsset - list[index - 1].totalAsset),
  }));

  const topEventNote = useMemo(() => {
    const dayEvents = getDailyMarketEvents(result.month).filter((event) => event.month === result.month);
    if (!dayEvents.length) return null;
    const topEvent = dayEvents[0];
    const etfName = etfs.find((etf) => topEvent.targetEtfs?.includes(etf.id))?.name;
    if (!etfName || !topEvent.effect) return null;
    const direction = topEvent.effect > 0 ? "走强" : "回落";
    const pct = (Math.abs(topEvent.effect) * 100).toFixed(1);
    return {
      text: `今天最重要的线索是「${topEvent.title}」，${etfName} 大致 ${direction} 了约 ${pct}%。`,
      isUp: topEvent.effect > 0,
    };
  }, [result.month]);

  const resultGuide = useMemo(() => {
    if (dismissedGuide) return null;
    if (result.month === 1) {
      return {
        title: "第 1 个交易日复盘",
        text: "先打开「ETF 当日表现」，查看沪深300ETF的模拟涨跌。结果上涨或下跌都正常，重点是确认“消息判断”和“价格结果”是否一致。",
        target: "returns" as ResultModal,
      };
    }
    if (result.month === 2) {
      return {
        title: "第 2 个交易日复盘",
        text: "先看「晚间研究笔记」，再看「ETF 当日表现」。从今天开始，你要把评分、走势和调仓结果串起来看。",
        target: "notes" as ResultModal,
      };
    }
    if (result.month <= 4) {
      return {
        title: "复盘提示",
        text: "先看重点，再按需展开细节。到第 5 个交易日后，系统提示会逐步减少，你需要独立完成判断。",
        target: null,
      };
    }
    return null;
  }, [dismissedGuide, result.month]);

  const guideTarget = resultGuide?.target ?? null;
  const isGuideTarget = (target: ResultModal) => guideTarget === target;

  return (
    <main className="screen fit-screen">
      <section className="game-frame result-frame result-frame--hub">
        <header className="compact-header">
          <div>
            <p className="eyebrow">Day {result.month} / {TOTAL_MONTHS}</p>
            <h1>本交易日结算</h1>
          </div>
          <div className="result-actions-inline">
            {!isFinal && !tutorialLocked ? (
              <PixelButton variant="secondary" onClick={onEndGame}>
                提前结束本局
              </PixelButton>
            ) : null}
            <PixelButton onClick={onNextMonth}>{isFinal ? "查看总报告" : "下个交易日"}</PixelButton>
          </div>
        </header>

        {tutorialLocked ? (
          <p className="tutorial-lock-hint">教学阶段进行中：前两个交易日请先完成“消息 → 交易 → 结算”的完整流程，避免跳过关键说明。</p>
        ) : null}

        <section className="result-hero">
          <div className="result-art">
            <img className="result-art__cat" src={selectedCat} alt={result.monthlyProfit >= 0 ? "开心的王初一" : "难过的王初一"} loading="lazy" decoding="async" />
          </div>
          <div className="feedback-strip">
            <strong>王初一说</strong>
            <p>{result.story ?? result.feedback}</p>
            {topEventNote ? <p className={topEventNote.isUp ? "up-text" : "down-text"}>{topEventNote.text}</p> : null}
          </div>
        </section>

        {resultGuide ? (
          <div className="tutorial-backdrop tutorial-backdrop--nonblocking" onClick={() => setDismissedGuide(true)}>
            <div className="tutorial-guide-card tutorial-guide-card--center" onClick={(event) => event.stopPropagation()}>
              <div className="tutorial-guide-card__top">
                <p className="eyebrow">{resultGuide.title}</p>
                <PixelButton className="tutorial-guide-card__close" variant="secondary" onClick={() => setDismissedGuide(true)} type="button">
                  关闭引导
                </PixelButton>
              </div>
              <p>{resultGuide.text}</p>
              {resultGuide.target ? (
                <button
                  className="pixel-button hub-button--tutorial"
                  type="button"
                  onClick={() => {
                    setResultModal(resultGuide.target);
                    setDismissedGuide(true);
                  }}
                >
                  去看这一项
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="center-hub-shell result-center-shell">
          <div className="center-hub result-center-hub">
            <div className="hub-button-grid result-button-grid">
              <button className={`hub-button hub-button--primary ${isGuideTarget("overview") ? "hub-button--tutorial" : ""}`} onClick={() => setResultModal("overview")} type="button">
                <strong>当日结果总览</strong>
                <span>查看收益、资产、仓位、生活波动和逐日变化</span>
              </button>
              <button className={`hub-button ${isGuideTarget("life") ? "hub-button--tutorial" : ""}`} onClick={() => setResultModal("life")} type="button">
                <strong>生活波动</strong>
                <span>{result.lifeEvent || result.lifeActions?.length ? "查看现金流和情绪影响" : "今天比较安静"}</span>
              </button>
              <button className={`hub-button ${isGuideTarget("notes") ? "hub-button--tutorial" : ""}`} onClick={() => setResultModal("notes")} type="button">
                <strong>晚间研究笔记</strong>
                <span>{result.nightIntel?.length ? `${result.nightIntel.length} 条可读` : "今晚没有新笔记"}</span>
              </button>
              <button className={`hub-button ${isGuideTarget("returns") ? "hub-button--tutorial" : ""}`} onClick={() => setResultModal("returns")} type="button">
                <strong>ETF 当日表现</strong>
                <span>{result.returns.length} 只 ETF 的模拟收盘表现</span>
              </button>
            </div>
          </div>
        </section>

        {resultModal === "overview" ? (
          <ResultModalFrame title="当日结果总览" eyebrow="总览" onClose={() => setResultModal(null)}>
            <section className="result-summary result-summary--modal">
              <div className="stat-card compact-result-stat">
                <span>投资收益</span>
                <strong className={result.monthlyProfit >= 0 ? "up-text" : "down-text"}>
                  {result.monthlyProfit >= 0 ? "+" : "-"}¥{formatMoney(Math.abs(result.monthlyProfit))}
                </strong>
                <small>{formatPercent(result.investmentReturnRate)}</small>
              </div>
              <div className="stat-card compact-result-stat">
                <span>当前资产</span>
                <strong>¥{formatMoney(result.currentTotalAsset)}</strong>
                <small className={result.currentTotalAsset >= result.previousTotalAsset ? "up-text" : "down-text"}>
                  {result.currentTotalAsset >= result.previousTotalAsset ? "+" : ""}
                  {formatMoney(result.currentTotalAsset - result.previousTotalAsset)}
                </small>
              </div>
              <div className="stat-card compact-result-stat">
                <span>生活波动</span>
                <strong className={lifeCash >= 0 ? "up-text" : "down-text"}>
                  {lifeCash >= 0 ? "+" : "-"}¥{formatMoney(Math.abs(lifeCash))}
                </strong>
                <small>{lifeActionCount} 次生活行动</small>
              </div>
            </section>

            {dailyChangeChartData.length > 1 ? (
              <section className="result-mini-panel">
                <div className="result-mini-panel__head">
                  <strong>每日净变化</strong>
                  <span>横轴是天数，纵轴是当天资金增减</span>
                </div>
                <div className="result-mini-panel__chart result-mini-panel__chart--full">
                  <LineTrendChart
                    color="#4f8c74"
                    data={dailyChangeChartData}
                    height={170}
                    xKey="day"
                    yKey="delta"
                    valueFormatter={(value: unknown) => {
                      const amount = Number(value);
                      return `${amount >= 0 ? "+" : "-"}¥${formatMoney(Math.abs(amount))}`;
                    }}
                    yTickFormatter={(value: unknown) => {
                      const amount = Number(value);
                      return `${amount >= 0 ? "+" : "-"}${Math.round(Math.abs(amount))}`;
                    }}
                  />
                </div>
              </section>
            ) : null}
          </ResultModalFrame>
        ) : null}

        {resultModal === "life" ? (
          <ResultModalFrame title="生活波动" eyebrow="生活" onClose={() => setResultModal(null)}>
            <div className="life-result-strip result-detail-strip">
              {result.lifeEvent ? (
                <p>
                  <strong>{result.lifeEvent.title}</strong>：{result.lifeEvent.description}
                </p>
              ) : (
                <p>今晚没有额外的生活波动。</p>
              )}
              {result.lifeActions?.map((action, index) => (
                <p key={`${action.id}-detail-${index}`}>
                  <strong>{action.title}</strong>：{action.description}
                </p>
              ))}
            </div>
          </ResultModalFrame>
        ) : null}

        {resultModal === "notes" ? (
          <ResultModalFrame title="晚间研究笔记" eyebrow="笔记" onClose={() => setResultModal(null)}>
            {result.nightIntel?.length ? (
              <section className="night-intel-grid night-intel-grid--modal">
                {result.nightIntel.map((item) => (
                  <article className={`notice compact-notice night-intel-card night-intel-card--${item.tone}`} key={item.id}>
                    <strong>{item.title}</strong>
                    <p>{item.content}</p>
                  </article>
                ))}
              </section>
            ) : (
              <div className="result-empty-state">
                <strong>今晚没有新的晚间研究笔记</strong>
                <p>今天更像是把白天看到的东西消化了一遍。王初一说，没多捡消息的时候，就更该记住自己为什么下单。</p>
              </div>
            )}
          </ResultModalFrame>
        ) : null}

        {resultModal === "returns" ? (
          <ResultModalFrame title="ETF 当日表现" eyebrow="收盘" onClose={() => setResultModal(null)}>
            <section className="return-grid compact-return-grid">
              {result.returns.map((monthlyReturnItem) => {
                const etf = etfs.find((item) => item.id === monthlyReturnItem.etfId);
                const isUp = monthlyReturnItem.returnRate >= 0;
                const history = gameState.priceHistory[monthlyReturnItem.etfId] ?? [];

                return (
                  <article className="return-card" key={monthlyReturnItem.etfId}>
                    <span>{etf?.icon}</span>
                    <div>
                      <strong>{etf?.name ?? monthlyReturnItem.etfId}</strong>
                      <p className={isUp ? "up-text" : "down-text"}>
                        {isUp ? "+" : ""}
                        {formatPercent(monthlyReturnItem.returnRate)}
                      </p>
                    </div>
                    {history.length > 1 ? (
                      <div style={{ gridColumn: "1 / -1", padding: "4px 0" }}>
                        <LineTrendChart
                          compact
                          color={isUp ? "#dc3545" : "#28a745"}
                          data={history.map((point) => ({ day: `D${point.month}`, value: Number(point.value.toFixed(3)) }))}
                          height={48}
                          xKey="day"
                          yKey="value"
                          valueFormatter={(value: unknown) => Number(value).toFixed(3)}
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </ResultModalFrame>
        ) : null}
      </section>
    </main>
  );
}

function ResultModalFrame({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card info-window-modal">
        <header className="compact-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <PixelButton variant="secondary" onClick={onClose}>
            关闭
          </PixelButton>
        </header>
        <div className="info-window-body">{children}</div>
      </section>
    </div>
  );
}


