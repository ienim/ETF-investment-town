import { type KeyboardEvent, type ReactNode, useState } from "react";
import { etfs as etfCatalog } from "../data/etfs";
import { expertTips, industryBriefs } from "../data/events";
import type { Etf, EtfId, GameState, LifeActionResult, LifeEvent, MarketEvent } from "../types/game";
import { buildGeneratedTips, type GeneratedTip } from "../utils/commentaryEngine";
import type { FactorScore } from "../utils/factorEngine";
import { formatMoney } from "../utils/portfolio";
import { LineTrendChart } from "./LineTrendChart";
import { PixelButton } from "./PixelButton";

export type ToastTone = "info" | "success" | "warning";

export type SignalItem = {
  id: string;
  title: string;
  description: string;
  phase: "隔夜要闻" | "今日要闻";
  category: "日常事件卡" | "重要事件卡" | "黑天鹅事件卡" | "市场噪声卡";
};

export type TipItem = GeneratedTip;
export type BriefItem = { id: string; title: string; detail: string; targetEtfs?: string[] };

export function ToastBanner({ text, tone, onDismiss }: { text: string; tone: ToastTone; onDismiss: () => void }) {
  return (
    <button className={`toast-banner toast-banner--${tone}`} onClick={onDismiss} type="button">
      {text}
    </button>
  );
}

export function ModalFrame({
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

export function InfoModalWindow({
  etfs,
  factorScores,
  gameState,
  showTrend,
  type,
  signals,
  tips,
  briefs,
  activeLifeEvent,
  selectedEtfDetail,
  onSelectEtfDetail,
  onBackEtfList,
  onClose,
}: {
  etfs: Etf[];
  factorScores: FactorScore[];
  gameState: GameState;
  showTrend: boolean;
  type: "signals" | "industry" | "etfs";
  signals: SignalItem[];
  tips: TipItem[];
  briefs: BriefItem[];
  activeLifeEvent?: LifeEvent;
  selectedEtfDetail?: EtfId | null;
  onSelectEtfDetail?: (etfId: EtfId | null) => void;
  onBackEtfList?: () => void;
  onClose: () => void;
}) {
  const titleMap = {
    signals: "消息与财报",
    industry: "行业风向",
    etfs: "ETF图鉴",
  } as const;

  const eyebrowMap = {
    signals: "信息窗",
    industry: "研究窗",
    etfs: "图鉴窗",
  } as const;

  return (
    <ModalFrame title={titleMap[type]} eyebrow={eyebrowMap[type]} onClose={onClose}>
      {type === "signals" ? <InfoList items={signals} secondItems={tips} briefs={briefs} activeLifeEvent={activeLifeEvent} /> : null}
      {type === "industry" ? <BriefList items={briefs} /> : null}
      {type === "etfs" ? (
        <EtfListPanel
          etfs={etfs}
          factorScores={factorScores}
          gameState={gameState}
          showTrend={showTrend}
          selectedDetail={selectedEtfDetail}
          onSelectDetail={onSelectEtfDetail}
          onBackList={onBackEtfList}
        />
      ) : null}
    </ModalFrame>
  );
}

export function LifeActionPanel({
  selectedLifeActions,
  dayCountdown,
  activeLifeEvent,
  tutorialLocked,
}: {
  selectedLifeActions: LifeActionResult[];
  dayCountdown: number;
  activeLifeEvent?: LifeEvent;
  tutorialLocked: boolean;
}) {
  const moodLabel =
    activeLifeEvent?.mood === "good" ? "偏利好" : activeLifeEvent?.mood === "bad" ? "偏支出" : "中性波动";

  return (
    <div className="feed-window life-feed-window">
      <div className="feed-toolbar">
        <div className="feed-chips">
          <span>{tutorialLocked ? "教学阶段不计时" : `剩余 ${formatClock(dayCountdown)}`}</span>
          <span>已安排 {selectedLifeActions.length} 项</span>
        </div>
      </div>

      {activeLifeEvent ? (
        <article className="notice compact-notice signal-card signal-card--life-event">
          <div className="signal-card__meta">
            <span>今日生活波动</span>
            <span>{moodLabel}</span>
          </div>
          <strong>{activeLifeEvent.title}</strong>
          <p>{activeLifeEvent.description}</p>
        </article>
      ) : null}

      {selectedLifeActions.length > 0 ? (
        <div className="selected-actions-strip selected-actions-strip--stacked">
          {selectedLifeActions.map((action, index) => (
            <span key={`${action.id}-${index}`}>
              {action.title} · {action.cashChange === 0 ? "现金无变化" : `${action.cashChange > 0 ? "+" : "-"}¥${formatMoney(Math.abs(action.cashChange))}`} · 耗时 {action.timeCostSeconds} 秒
            </span>
          ))}
        </div>
      ) : (
        <div className="empty-inline-note">今天还没安排生活行动。下面这些更像日常选择：它们会一起影响你的时间、现金和情绪节奏。</div>
      )}
    </div>
  );
}

function InfoList({
  items,
  secondItems,
  briefs,
  activeLifeEvent,
}: {
  items: SignalItem[];
  secondItems: TipItem[];
  briefs: BriefItem[];
  activeLifeEvent?: LifeEvent;
}) {
  const [tab, setTab] = useState<"all" | "facts" | "views">("all");
  const filteredFacts = tab === "views" ? [] : items;
  const filteredViews = tab === "facts" ? [] : secondItems;

  return (
    <div className="feed-window">
      <div className="feed-toolbar">
        <div className="feed-chips">
          <span>{items.length} 条事实消息</span>
          <span>{secondItems.length} 条观点</span>
          <span>{briefs.length} 条财报/行业线索</span>
          {activeLifeEvent ? <span>今晚有生活波动</span> : null}
        </div>
        <div className="tab-bar feed-tab-bar">
          <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} type="button">
            全部
          </button>
          <button className={tab === "facts" ? "active" : ""} onClick={() => setTab("facts")} type="button">
            事实
          </button>
          <button className={tab === "views" ? "active" : ""} onClick={() => setTab("views")} type="button">
            观点
          </button>
        </div>
      </div>

      <div className="feed-column">
        {filteredFacts.map((item) => (
          <article key={item.id} className="notice compact-notice signal-card signal-card--news">
            <div className="signal-card__meta">
              <span>{item.phase}</span>
              <span>{item.category}</span>
            </div>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}

        {filteredViews.map((item) => (
          <article key={item.id} className={`notice compact-notice signal-card signal-card--${item.tone}`}>
            <div className="signal-card__meta">
              <span>{item.speaker}</span>
              <span>{item.tone === "solid" ? "偏稳的判断" : item.tone === "mixed" ? "半真半假" : "情绪噪声"}</span>
            </div>
            <p>{item.content}</p>
          </article>
        ))}

        {briefs.length > 0 ? (
          <div className="brief-list brief-feed-list">
            {briefs.map((item) => (
              <article key={item.id} className="notice compact-notice signal-card signal-card--brief">
                <div className="signal-card__meta">
                  <span>财报/行业预期</span>
                  <span>{item.targetEtfs?.length ? "结合评分一起看" : "偏宏观线索"}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BriefList({ items }: { items: BriefItem[] }) {
  return (
    <div className="brief-list brief-feed-list">
      {items.map((item) => (
        <article key={item.id} className="notice compact-notice signal-card signal-card--brief">
          <div className="signal-card__meta">
            <span>行业跟踪</span>
            <span>{item.targetEtfs?.length ? "主题线索" : "广义线索"}</span>
          </div>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

function EtfListPanel({
  etfs: etfList,
  factorScores,
  gameState,
  showTrend,
  selectedDetail,
  onSelectDetail,
  onBackList,
}: {
  etfs: Etf[];
  factorScores: FactorScore[];
  gameState: GameState;
  showTrend: boolean;
  selectedDetail?: EtfId | null;
  onSelectDetail?: (etfId: EtfId | null) => void;
  onBackList?: () => void;
}) {
  const [internalSelectedDetail, setInternalSelectedDetail] = useState<EtfId | null>(null);
  const currentSelectedDetail = selectedDetail !== undefined ? selectedDetail : internalSelectedDetail;
  const selectedEtf = currentSelectedDetail ? etfList.find((etf) => etf.id === currentSelectedDetail) : null;
  const selectedScore = currentSelectedDetail ? factorScores.find((score) => score.etfId === currentSelectedDetail) : null;
  const setSelectedDetailValue = (etfId: EtfId | null) => {
    if (selectedDetail !== undefined) {
      onSelectDetail?.(etfId);
      return;
    }
    setInternalSelectedDetail(etfId);
  };

  if (currentSelectedDetail && selectedEtf) {
    return (
      <div className="etf-detail-inline">
        <div className="compact-header" style={{ marginBottom: 12 }}>
          <div>
            <p className="eyebrow">图鉴详情</p>
            <h2>
              {selectedEtf.icon} {selectedEtf.name}
            </h2>
          </div>
          <PixelButton
            variant="secondary"
            onClick={() => {
              setSelectedDetailValue(null);
              onBackList?.();
            }}
          >
            返回列表
          </PixelButton>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="etf-detail-badge etf-detail-badge--category">{selectedEtf.category}</span>
            <span className="etf-detail-badge etf-detail-badge--risk">风险：{selectedEtf.risk}</span>
            {selectedEtf.dividendYield ? (
              <span className="etf-detail-badge etf-detail-badge--div">分红 {(selectedEtf.dividendYield * 100).toFixed(1)}%</span>
            ) : null}
            {selectedEtf.monthlyBuyLimit ? (
              <span className="etf-detail-badge etf-detail-badge--limit">本日额度 ¥{formatMoney(selectedEtf.monthlyBuyLimit)}</span>
            ) : null}
          </div>

          <div style={{ padding: "8px 10px", border: "2px solid #3d2a1f", background: "#fff8dc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "0.82rem" }}>当前净值</span>
            <strong>¥{formatMoney(gameState.etfPrices[currentSelectedDetail] * 1000)} / 1000份</strong>
          </div>

          <div style={{ padding: "7px", border: "2px solid #5d3b2e", background: "#ffe6ad" }}>
            <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>{selectedEtf.style}</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", lineHeight: 1.4, color: "#795b47" }}>{selectedEtf.feature}</p>
          </div>

          <div>
            <strong style={{ display: "block", marginBottom: 6, fontSize: "0.82rem" }}>近期走势</strong>
            {showTrend && gameState.priceHistory[currentSelectedDetail]?.length > 0 ? (
              <div className="mini-chart-card" style={{ padding: 6 }}>
                <LineTrendChart
                  color="#4f8c74"
                  data={gameState.priceHistory[currentSelectedDetail].map((point) => ({
                    day: `D${point.month}`,
                    value: Number(point.value.toFixed(3)),
                  }))}
                  height={120}
                  xKey="day"
                  yKey="value"
                  valueFormatter={(value: unknown) => Number(value).toFixed(3)}
                />
              </div>
            ) : (
              <div style={{ padding: "16px 12px", border: "2px solid #5d3b2e", background: "#fff8dc", textAlign: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>第 2 天后开放走势观察</span>
                <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#795b47" }}>第 1 天先看定位和评分，第 2 天再把走势一起接进判断。</p>
              </div>
            )}
          </div>

          {selectedScore ? (
            <div>
              <strong style={{ display: "block", marginBottom: 6, fontSize: "0.82rem" }}>因子评分</strong>
              <FactorMiniPanel score={selectedScore} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="etf-list" style={{ display: "grid", gap: 6 }}>
      {etfList.map((etf) => {
        const score = factorScores.find((item) => item.etfId === etf.id);
        const handleOpen = () => setSelectedDetailValue(etf.id);

        return (
          <div
            className="etf-list-item"
            key={etf.id}
            onClick={handleOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpen();
              }
            }}
          >
            <div className="etf-list-item__icon">{etf.icon}</div>
            <div className="etf-list-item__info">
              <span className="etf-list-item__name">{etf.name}</span>
              <span className="etf-list-item__category">{etf.category}</span>
            </div>
            <div className="etf-list-item__badges">
              <span className="etf-detail-badge etf-detail-badge--risk">风险：{etf.risk}</span>
              {score ? <span className="etf-detail-badge etf-detail-badge--score">{score.probability}%</span> : null}
            </div>
            <div className="etf-list-item__price">¥{formatMoney(gameState.etfPrices[etf.id] * 1000)}</div>
          </div>
        );
      })}
    </div>
  );
}

function FactorMiniPanel({ score }: { score?: FactorScore }) {
  if (!score) return null;

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

export function enrichMarketEvent(event: MarketEvent, index: number): SignalItem {
  const category: SignalItem["category"] =
    event.eventType === "blackSwan"
      ? "黑天鹅事件卡"
      : event.eventType === "important"
        ? "重要事件卡"
        : event.truthiness === "noise"
          ? "市场噪声卡"
          : "日常事件卡";

  const targetNames = event.targetEtfs
    .map((etfId) => etfCatalog.find((item) => item.id === etfId)?.name ?? etfId)
    .join("、");

  return {
    id: event.id,
    title: event.title,
    description:
      "事实：" +
      event.description +
      (targetNames ? ` 可能影响：${targetNames}。` : "") +
      (event.explanation ? ` 解读：${event.explanation}` : ""),
    phase: event.phase === "today" && index % 2 === 1 ? "今日要闻" : "隔夜要闻",
    category,
  };
}

export function getTipsForDay(month: number, factorScores: FactorScore[], events: MarketEvent[], gameState: GameState) {
  const picked = expertTips.filter((tip) => tip.month === month);
  return buildGeneratedTips(month, factorScores, events, picked, gameState);
}

export function getBriefsForDay(month: number): BriefItem[] {
  const picked = industryBriefs.filter((brief) => brief.month === month);
  if (picked.length > 0) {
    return picked.map((brief) => ({
      ...brief,
      targetEtfs: brief.targetEtfs.map((etfId) => etfCatalog.find((item) => item.id === etfId)?.name ?? etfId),
    }));
  }

  const lead = etfCatalog[(month + 1) % etfCatalog.length];
  const hedge = etfCatalog[(month + 4) % etfCatalog.length];

  return [
    {
      id: `fallback-brief-${month}`,
      title: "行业跟踪摘要",
      detail: `${lead.name} 所在方向的关注度正在抬升；同时，${hedge.name} 更像是在给组合做情绪缓冲。`,
    },
  ];
}

export function getLifeActionTag(id: LifeActionResult["id"]) {
  switch (id) {
    case "listenNews":
      return "消息";
    case "deepResearch":
      return "研究";
    case "dinnerTalk":
      return "社交";
    case "lottery":
      return "随机";
    case "focusWork":
      return "现金流";
    default:
      return "日常";
  }
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
