import { type ReactNode, useEffect, useMemo, useState } from "react";
import { LineTrendChart } from "../components/LineTrendChart";
import { PixelAvatar } from "../components/PixelAvatar";
import { PixelButton } from "../components/PixelButton";
import { getPersonalityInfo, metricLabels } from "../data/investorProfiles";
import { etfs } from "../data/etfs";
import type { EtfId, GameState, InvestorMetrics } from "../types/game";
import {
  formatMoney,
  formatPercent,
  getDrawdown,
  getHoldingValue,
  getTotalAsset,
} from "../utils/portfolio";

interface FinalReportScreenProps {
  gameState: GameState;
  onRestart: () => void;
}

type FinalModalKind = "overview" | "chart" | "metrics" | "etf" | "holdings" | null;

type PersonalityCard = {
  title: string;
  summary: string;
  eyebrow: string;
};

const techEtfs: EtfId[] = ["ai", "chip", "newEnergy", "lowAltitude", "star50"];

export function FinalReportScreen({ gameState, onRestart }: FinalReportScreenProps) {
  const [modalKind, setModalKind] = useState<FinalModalKind>(null);
  const [revealIndex, setRevealIndex] = useState<number | null>(0);

  const initialAsset = gameState.contributedCash || 1;
  const finalAsset = getTotalAsset(gameState);
  const investmentAsset = finalAsset - gameState.externalCashDelta;
  const totalReturn = investmentAsset / initialAsset - 1;
  const assetValues = gameState.assetHistory.map((item) => item.totalAsset);
  const highestAsset = Math.max(...assetValues, finalAsset);
  const lowestAsset = Math.min(...assetValues, finalAsset);
  const maxDrawdown = getDrawdown(gameState.assetHistory);
  const personality = getInvestmentPersonality(gameState, totalReturn, maxDrawdown);
  const personalityInfo = getPersonalityInfo(gameState);
  const bestAndWorst = getBestAndWorstEtf(gameState);
  const decisionSummary = getDecisionSummary(gameState);

  const dailyChangeChartData = gameState.assetHistory.map((item, index, list) => ({
    day: `D${item.month}`,
    delta: Math.round(index === 0 ? 0 : item.totalAsset - list[index - 1].totalAsset),
  }));

  const currentPositions = etfs
    .map((etf) => ({
      id: etf.id,
      name: etf.name,
      value: getEtfValue(gameState, etf.id),
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);

  const performanceRows = etfs
    .map((etf) => {
      const first = gameState.priceHistory[etf.id][0]?.value ?? 1;
      const last = gameState.priceHistory[etf.id].at(-1)?.value ?? first;
      return {
        id: etf.id,
        name: etf.name,
        icon: etf.icon,
        returnRate: last / first - 1,
      };
    })
    .sort((left, right) => right.returnRate - left.returnRate);

  const personalityLines = useMemo(
    () => buildPersonalityLines(gameState.investorProfile?.metrics, totalReturn, maxDrawdown),
    [gameState.investorProfile?.metrics, totalReturn, maxDrawdown],
  );

  const reportHighlights = useMemo(
    () =>
      buildReportHighlights({
        totalReturn,
        maxDrawdown,
        bestEtf: bestAndWorst.best,
        worstEtf: bestAndWorst.worst,
        positionCount: currentPositions.length,
        finalAsset,
        initialAsset,
      }),
    [bestAndWorst.best, bestAndWorst.worst, currentPositions.length, finalAsset, initialAsset, maxDrawdown, totalReturn],
  );

  const revealCards = useMemo(() => {
    const cards: PersonalityCard[] = [
      {
        eyebrow: "你的投资人格",
        title: personality.title,
        summary: personality.summary,
      },
    ];

    if (personalityInfo.easterEgg) {
      cards.push({
        eyebrow: "你的隐藏侧写",
        title: `${personalityInfo.easterEgg.emoji} ${personalityInfo.easterEgg.name}`,
        summary: personalityInfo.easterEgg.description,
      });
    }

    return cards;
  }, [personality.summary, personality.title, personalityInfo.easterEgg]);

  useEffect(() => {
    setRevealIndex(0);
  }, [gameState.month]);

  const revealCard = revealIndex !== null ? revealCards[revealIndex] ?? null : null;

  const closeReveal = () => {
    if (revealIndex === null) return;
    if (revealIndex < revealCards.length - 1) {
      setRevealIndex(revealIndex + 1);
      return;
    }
    setRevealIndex(null);
  };

  return (
    <main className="screen fit-screen">
      <section className="game-frame final-frame">
        <header className="compact-header">
          <div>
            <p className="eyebrow">收官报告</p>
            <h1>投资人格报告</h1>
          </div>
          <PixelButton onClick={onRestart}>重新开始</PixelButton>
        </header>

        <section className="result-personality result-personality--hero final-personality-hero">
          <div className="final-personality-hero__avatar">
            <PixelAvatar kind="cat" size="small" />
          </div>
          <div className="final-personality-hero__content">
            <p className="eyebrow">你的收官身份</p>
            <div className="result-personality__title">{personality.title}</div>
            <div className="result-personality__desc">{personality.summary}</div>
            {gameState.investorProfile ? (
              <div className="result-personality__egg">这一局的底色：{gameState.investorProfile.lifeLine}</div>
            ) : null}
          </div>
        </section>

        <section className="center-hub-shell result-center-shell">
          <div className="center-hub result-center-hub final-hub">
            <div className="hub-button-grid result-button-grid final-button-grid">
              <button className="hub-button hub-button--primary" onClick={() => setModalKind("metrics")} type="button">
                <strong>投资人格</strong>
                <span>先看你更像哪一类投资者，再看细分指标</span>
              </button>
              <button className="hub-button" onClick={() => setModalKind("overview")} type="button">
                <strong>总览</strong>
                <span>最终资金、收益率、回撤和节奏都收在这里</span>
              </button>
              <button className="hub-button" onClick={() => setModalKind("chart")} type="button">
                <strong>逐日资金变化</strong>
                <span>{dailyChangeChartData.length} 个交易日的净变化曲线</span>
              </button>
              <button className="hub-button" onClick={() => setModalKind("etf")} type="button">
                <strong>ETF复盘</strong>
                <span>{bestAndWorst.best} 最亮眼，{bestAndWorst.worst} 最拖累</span>
              </button>
              <button className="hub-button" onClick={() => setModalKind("holdings")} type="button">
                <strong>收官持仓</strong>
                <span>{currentPositions.length} 只陪你走到最后</span>
              </button>
            </div>
          </div>
        </section>

        {modalKind === "overview" ? (
          <FinalModal title="结果总览" eyebrow="总览" onClose={() => setModalKind(null)}>
            <div className="final-overview-grid">
              <div className="stat-card compact-result-stat">
                <span>最终资金</span>
                <strong>¥{formatMoney(finalAsset)}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>模拟总收益率</span>
                <strong className={totalReturn >= 0 ? "up-text" : "down-text"}>{formatPercent(totalReturn)}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>最大过程回撤</span>
                <strong>{formatPercent(maxDrawdown)}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>决策节奏</span>
                <strong>{decisionSummary.averageText}</strong>
                <small>{decisionSummary.lockedText}</small>
              </div>
              <div className="stat-card compact-result-stat">
                <span>最高资产</span>
                <strong>¥{formatMoney(highestAsset)}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>最低资产</span>
                <strong>¥{formatMoney(lowestAsset)}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>模拟表现最佳</span>
                <strong>{bestAndWorst.best}</strong>
              </div>
              <div className="stat-card compact-result-stat">
                <span>模拟表现最弱</span>
                <strong>{bestAndWorst.worst}</strong>
              </div>
            </div>

            <div className="final-story-list">
              {reportHighlights.map((line) => (
                <div className="final-modal-note" key={line}>
                  <p>{line}</p>
                </div>
              ))}
            </div>
          </FinalModal>
        ) : null}

        {modalKind === "chart" ? (
          <FinalModal title="每日变化曲线" eyebrow="变化" onClose={() => setModalKind(null)}>
            <div className="panel compact-panel chart-panel">
              <div className="section-title tight-title">
                <h2>这里只看每天结束后，你比前一天多了还是少了多少钱。</h2>
                <p>横轴是天数，纵轴是当天的净变化，不再把总资产堆在一起看。</p>
              </div>
              <LineTrendChart
                data={dailyChangeChartData}
                xKey="day"
                yKey="delta"
                color="#d26a45"
                height={220}
                valueFormatter={(value) => {
                  const amount = Number(value);
                  return `${amount >= 0 ? "+" : "-"}¥${formatMoney(Math.abs(amount))}`;
                }}
                yTickFormatter={(value) => {
                  const amount = Number(value);
                  return `${amount >= 0 ? "+" : "-"}${Math.round(Math.abs(amount))}`;
                }}
              />
            </div>
            <div className="final-story-list">
              <div className="final-modal-note">
                <p>{decisionSummary.text}</p>
              </div>
            </div>
          </FinalModal>
        ) : null}

        {modalKind === "metrics" ? (
          <FinalModal title="投资人格" eyebrow="画像" onClose={() => setModalKind(null)}>
            <div className="result-personality final-personality-card">
              <div className="result-personality__title">{personality.title}</div>
              <div className="result-personality__desc">{personality.summary}</div>
              {gameState.investorProfile ? (
                <div className="result-personality__egg">这一局的底色：{gameState.investorProfile.lifeLine}</div>
              ) : null}
            </div>

            {gameState.investorProfile ? (
              <>
                <div className="metric-grid final-metric-grid">
                  {Object.entries(metricLabels).map(([key, label]) => {
                    const value = gameState.investorProfile?.metrics[key as keyof InvestorMetrics] ?? 0;
                    return (
                      <div className="metric-bar" key={key}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <i style={{ width: `${value}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="final-story-list">
                  {personalityLines.map((line) => (
                    <div className="final-modal-note" key={line}>
                      <p>{line}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="empty-text">这一局还没留下完整的心理画像，不过王初一已经记住了你的节奏。</p>
            )}
          </FinalModal>
        ) : null}

        {modalKind === "etf" ? (
          <FinalModal title="ETF复盘" eyebrow="图鉴" onClose={() => setModalKind(null)}>
            <div className="final-performance-list">
              {performanceRows.map((row) => (
                <div className="final-performance-row" key={row.id}>
                  <span>{row.icon}</span>
                  <strong>{row.name}</strong>
                  <b className={row.returnRate >= 0 ? "up-text" : "down-text"}>
                    {row.returnRate >= 0 ? "+" : ""}
                    {formatPercent(row.returnRate)}
                  </b>
                </div>
              ))}
            </div>
          </FinalModal>
        ) : null}

        {modalKind === "holdings" ? (
          <FinalModal title="收官持仓" eyebrow="持仓" onClose={() => setModalKind(null)}>
            {currentPositions.length > 0 ? (
              <div className="final-position-list">
                {currentPositions.map((item) => (
                  <div className="final-position-row" key={item.id}>
                    <span>{item.name}</span>
                    <strong>¥{formatMoney(item.value)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">你最后几乎没有留仓，更像是把主动权重新放回了现金里。</p>
            )}
            <div className="final-story-list">
              <div className="final-modal-note">
                <p>
                  {currentPositions.length > 0
                    ? "这些就是你愿意带到收官夜里的仓位。它们不一定最热，但一定是你最后还愿意继续拿着的。"
                    : "这局里，你把更多主动权留给了下一次更确定的机会。"}
                </p>
              </div>
            </div>
          </FinalModal>
        ) : null}

        {revealCard ? (
          <FinalModal
            title={revealCard.title}
            eyebrow={revealCard.eyebrow}
            onClose={closeReveal}
          >
            <div className="result-personality final-personality-card">
              <div className="result-personality__title">{revealCard.title}</div>
              <div className="result-personality__desc">{revealCard.summary}</div>
              {gameState.investorProfile && revealIndex === 0 ? (
                <div className="result-personality__egg">这一局的底色：{gameState.investorProfile.lifeLine}</div>
              ) : null}
            </div>
            <div className="final-story-list">
              <div className="final-modal-note">
                <p>
                  {revealIndex !== null && revealIndex < revealCards.length - 1
                    ? "先收下这张人格卡，关掉后会继续弹出你的另一面。"
                    : "这张卡会一直留在最终报告里，后面你也可以随时再点开。"}
                </p>
              </div>
            </div>
          </FinalModal>
        ) : null}
      </section>
    </main>
  );
}

function FinalModal({
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

function buildPersonalityLines(metrics: InvestorMetrics | undefined, totalReturn: number, maxDrawdown: number) {
  if (!metrics) {
    return ["这一局还没留下完整的人格轨迹，但王初一已经记住了你的手感和节奏。"];
  }

  const lines: string[] = [];

  lines.push(
    metrics.fomo >= 68
      ? "你的 FOMO 偏高，热点一热起来，你就更容易更快出手。"
      : "你的 FOMO 不算高，说明你更愿意先等等，不太会被市场喧闹直接拽走。",
  );

  lines.push(
    metrics.contrarian >= 65
      ? "你的逆向思维比较强，大家一起冲的时候，你会更想先退半步再看。"
      : "你更像顺势型选手，愿意跟着自己看得懂的主线走，而不是为了逆向而逆向。",
  );

  lines.push(
    metrics.discipline >= 60
      ? "你的纪律性不错，不只会看消息，也更能把操作收回到自己的计划里。"
      : "你的纪律性还有提升空间，有时刚看到线索，就会比原计划更快地下手。",
  );

  lines.push(
    totalReturn >= 0.1 && maxDrawdown <= 0.18
      ? "这局你不是靠硬扛换收益，而是把节奏和风险一起顾住了。"
      : maxDrawdown >= 0.22
        ? "这局最值得复盘的是：你对机会的接受速度，有时候跑到了风险缓冲前面。"
        : "整体来看，你已经在慢慢形成自己的打法，只是还需要多几局把风格磨得更稳定。",
  );

  return lines;
}

function buildReportHighlights(input: {
  totalReturn: number;
  maxDrawdown: number;
  bestEtf: string;
  worstEtf: string;
  positionCount: number;
  finalAsset: number;
  initialAsset: number;
}) {
  const lines: string[] = [];

  if (input.totalReturn >= 0.12) {
    lines.push(`这局你把账户往上抬了不少，${input.bestEtf} 是最给力的顺风位。`);
  } else if (input.totalReturn >= 0) {
    lines.push(`这局你守住了本金，还让账户慢慢往上挪，${input.bestEtf} 帮了不少忙。`);
  } else {
    lines.push(`这局最后没有收红，${input.worstEtf} 成了主要拖累，不过这份复盘本身就很有价值。`);
  }

  if (input.maxDrawdown <= 0.12) {
    lines.push("你的回撤控制得很轻，说明你不只盯着涨跌，也会顾组合能不能睡得着。");
  } else if (input.maxDrawdown >= 0.25) {
    lines.push("回撤阶段比较剧烈，说明你抓机会时很敢，但风险缓冲还不够厚。");
  } else {
    lines.push("回撤落在还算能接受的区间，说明你在进攻和防守之间已经有一点自己的平衡感。");
  }

  lines.push(
    input.positionCount > 0
      ? `收官时你还留着 ${input.positionCount} 只 ETF，更像会带着判断过夜的人。`
      : "收官时你几乎清空了持仓，更像把主动权留给下一次更确定的机会。",
  );

  lines.push(
    input.finalAsset >= input.initialAsset
      ? "王初一的结论是：你更像在搭一套慢慢成形的方法，而不是只赌某一天的输赢。"
      : "王初一的结论是：这局虽然不完美，但已经暴露了你最真实的决策习惯，后面很好改。",
  );

  return lines;
}

function getInvestmentPersonality(gameState: GameState, totalReturn: number, maxDrawdown: number) {
  const metrics = gameState.investorProfile?.metrics;
  const techBuys = getBuyAmount(gameState, techEtfs);
  const totalBuys = getBuyAmount(
    gameState,
    etfs.map((etf) => etf.id),
  );
  const techRatio = totalBuys > 0 ? techBuys / totalBuys : 0;
  const cashRatio = gameState.cash / Math.max(1, getTotalAsset(gameState));
  const dividendValue = getEtfValue(gameState, "dividend");
  const dividendRatio = dividendValue / Math.max(1, getTotalAsset(gameState));
  const nasdaqBuys = getBuyAmount(gameState, ["nasdaq"]);

  if (gameState.gameOverReason === "cashZero") {
    return {
      title: "泡面金融家",
      summary: "你是真的敢上，只是市场不会因为热情就把本金还回来。这局的价值，在于把冒进暴露得很彻底。",
    };
  }

  if (gameState.gameOverReason === "drawdown") {
    return {
      title: "家庭风控失败",
      summary: "你不是不会找机会，而是仓位比计划跑得更快。先学会给自己留后手，再谈下一次冲刺。",
    };
  }

  if (totalReturn >= 0.16 && maxDrawdown <= 0.12) {
    return {
      title: "风控大师",
      summary: "你把收益和回撤捏得很稳，像是在用节奏做交易，而不是靠情绪做决定。",
    };
  }

  if (totalReturn >= 0.16 && maxDrawdown >= 0.24) {
    return {
      title: "过山车战神",
      summary: "你确实能抓到上涨，但过程也真够心跳。收益亮眼，曲线吓人。",
    };
  }

  if (dividendRatio >= 0.33 && maxDrawdown <= 0.18) {
    return {
      title: "分红仙人",
      summary: "你很懂得给组合垫一层软垫，稳健现金流一直是你的偏爱。",
    };
  }

  if (nasdaqBuys >= 7000 && totalReturn > -0.05) {
    return {
      title: "美股定投人",
      summary: "你对长期趋势很有耐心，不太追单日刺激，更像在和时间一起做复利。",
    };
  }

  if (metrics && metrics.fomo >= 74 && techRatio >= 0.52 && gameState.tradeRecords.length >= 10) {
    return {
      title: "热点猎人",
      summary: "你对主题轮动和新叙事特别敏感，出手快，但也更容易被高波动牵着情绪走。",
    };
  }

  if (techRatio >= 0.58 && totalReturn > -0.08) {
    return {
      title: "科技信仰战士",
      summary: "你明显更相信成长和科技叙事，喜欢把筹码压在未来，而不是眼前的稳妥。",
    };
  }

  if (metrics && metrics.contrarian >= 72 && maxDrawdown <= 0.2) {
    return {
      title: "逆向观察员",
      summary: "你不喜欢和人群一起冲，越是满屏一致，越会想先退一步再看。",
    };
  }

  if (
    cashRatio >= 0.82 &&
    (metrics?.cashSecurity ?? 0) >= 80 &&
    totalReturn <= 0.05 &&
    gameState.tradeRecords.length <= 8 &&
    techRatio < 0.22
  ) {
    return {
      title: "现金为王",
      summary: "你非常重视安全垫。别人追风口时，你更像在给自己准备下一次更稳的出手机会。",
    };
  }

  return {
    title: "稳健小镇居民",
    summary: "你的整体节奏比较均衡，既会看机会，也会给自己留安全边界。",
  };
}

function getBestAndWorstEtf(gameState: GameState) {
  const rows = etfs.map((etf) => {
    const first = gameState.priceHistory[etf.id][0]?.value ?? 1;
    const last = gameState.priceHistory[etf.id].at(-1)?.value ?? first;
    return { name: etf.name, value: last / first - 1 };
  });

  const best = rows.reduce((winner, row) => (row.value > winner.value ? row : winner), rows[0]);
  const worst = rows.reduce((loser, row) => (row.value < loser.value ? row : loser), rows[0]);

  return { best: best.name, worst: worst.name };
}

function getBuyAmount(gameState: GameState, ids: EtfId[]) {
  return gameState.tradeRecords
    .filter((record) => record.type === "buy" && ids.includes(record.etfId))
    .reduce((sum, record) => sum + record.amount, 0);
}

function getEtfValue(gameState: GameState, id: EtfId) {
  const holding = gameState.holdings.find((item) => item.etfId === id);
  return holding ? getHoldingValue(holding, gameState.etfPrices) : 0;
}

function getDecisionSummary(gameState: GameState) {
  const stats = gameState.decisionStats;
  const rounds = stats.records.length;

  if (rounds === 0) {
    return {
      averageText: "暂无记录",
      lockedText: "0 天超时",
      text: "这一局还没有留下足够多的盘中节奏记录，但你已经走出了自己的第一步。",
    };
  }

  const averageUsed = stats.totalUsedSeconds / rounds;
  const averageText = `${averageUsed.toFixed(1)} 秒/天`;
  const lockedText = `${stats.lockedDays} 天超时`;
  const text =
    stats.lockedDays >= Math.ceil(rounds / 2)
      ? "你经常等到窗口快结束才行动，说明你偏谨慎，但也更容易错过前段机会。"
      : averageUsed <= 45
        ? "你的决策速度很快，行动力强，但也要防止自己在还没想清楚时就已经下手。"
        : "你的决策速度比较均衡，会看消息，也不会一直被消息牵着走。";

  return { averageText, lockedText, text };
}
