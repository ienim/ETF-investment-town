import type { Etf, GameState, MonthlyReturn } from "../types/game";
import { getTotalAsset, getTotalHoldingValue } from "../utils/portfolio";
import type { DailyChallenge, DailyChallengeResult, DailyGoalProgress, Difficulty, MarketRegime, TownGrowthResult, TownProgress } from "../types/gameplay";

export interface DifficultyConfig {
  id: Difficulty;
  name: string;
  shortName: string;
  description: string;
  daySeconds: number;
  maxDrawdownLimit: number;
  marketVolatilityMultiplier: number;
  cashReserve: number;
  enableDailyGoals: boolean;
  enableCausalReview: boolean;
  enableStrategyOrders: boolean;
  enableMarketRegimes: boolean;
  goalPoints: number;
}

export const DEFAULT_DIFFICULTY: Difficulty = "standard";

export const difficultyConfigs: Record<Difficulty, DifficultyConfig> = {
  casual: {
    id: "casual",
    name: "轻松模式",
    shortName: "轻松",
    description: "时间更宽裕，市场波动更柔和；保留每日目标，适合先熟悉完整流程。",
    daySeconds: 180,
    maxDrawdownLimit: 0.3,
    marketVolatilityMultiplier: 0.78,
    cashReserve: 6000,
    enableDailyGoals: true,
    enableCausalReview: false,
    enableStrategyOrders: false,
    enableMarketRegimes: false,
    goalPoints: 4,
  },
  standard: {
    id: "standard",
    name: "标准模式",
    shortName: "标准",
    description: "标准节奏，加入每日目标和结算因果复盘；可设置基础止盈/止损策略。",
    daySeconds: 120,
    maxDrawdownLimit: 0.22,
    marketVolatilityMultiplier: 1,
    cashReserve: 8000,
    enableDailyGoals: true,
    enableCausalReview: true,
    enableStrategyOrders: true,
    enableMarketRegimes: false,
    goalPoints: 6,
  },
  advanced: {
    id: "advanced",
    name: "进阶挑战",
    shortName: "进阶",
    description: "每局生成独立行情种子，时间更紧、回撤限制更严，并加入市场环境、每日目标和完整策略单。",
    daySeconds: 90,
    maxDrawdownLimit: 0.16,
    marketVolatilityMultiplier: 1.08,
    cashReserve: 10000,
    enableDailyGoals: true,
    enableCausalReview: true,
    enableStrategyOrders: true,
    enableMarketRegimes: true,
    goalPoints: 8,
  },
};

export function getDifficultyConfig(difficulty: Difficulty = DEFAULT_DIFFICULTY) {
  return difficultyConfigs[difficulty] ?? difficultyConfigs[DEFAULT_DIFFICULTY];
}

function seededValue(month: number, salt: number, marketSeed?: number) {
  const seedMix = marketSeed === undefined ? 0 : marketSeed * 0.000000619;
  const value = Math.sin(month * 73.17 + salt * 19.31 + seedMix * (salt + 5)) * 10000;
  return value - Math.floor(value);
}

export function getMarketRegime(month: number, difficulty: Difficulty, marketSeed?: number): MarketRegime | undefined {
  if (!getDifficultyConfig(difficulty).enableMarketRegimes) return undefined;

  const roll = seededValue(month, 7, marketSeed);
  if (roll < 0.2) {
    return {
      id: "bull",
      name: "风险偏好回升",
      description: "市场更愿意为成长故事付钱，但高位追涨也更容易被波动反噬。",
      returnBias: 0.005,
      volatilityMultiplier: 0.92,
    };
  }
  if (roll < 0.43) {
    return {
      id: "bear",
      name: "避险情绪升温",
      description: "资金更偏向防守，现金和安全资产的价值会被放大。",
      returnBias: -0.005,
      volatilityMultiplier: 1.04,
    };
  }
  if (roll < 0.7) {
    return {
      id: "volatile",
      name: "高波动日",
      description: "消息与价格都容易放大，止盈止损纪律比方向判断更重要。",
      returnBias: 0,
      volatilityMultiplier: 1.45,
    };
  }
  return {
    id: "calm",
    name: "平静盘面",
    description: "没有特别强的宏观方向，仓位和结构比择时更重要。",
    returnBias: 0,
    volatilityMultiplier: 0.86,
  };
}

function clampReturn(value: number, highVolatility = false) {
  const limit = highVolatility ? 0.1 : 0.06;
  return Math.max(-limit, Math.min(limit, value));
}

export function applyDifficultyToMonthlyReturns(
  returns: MonthlyReturn[],
  month: number,
  difficulty: Difficulty,
  etfCatalog: Etf[], marketSeed?: number,
) {
  const config = getDifficultyConfig(difficulty);
  const regime = getMarketRegime(month, difficulty, marketSeed);
  const adjusted = returns.map((item) => {
    const etf = etfCatalog.find((candidate) => candidate.id === item.etfId);
    const multiplier = config.marketVolatilityMultiplier * (regime?.volatilityMultiplier ?? 1);
    const returnRate = clampReturn(
      item.returnRate * multiplier + (regime?.returnBias ?? 0),
      Boolean(etf?.highVolatility),
    );

    return {
      ...item,
      returnRate,
      parts: {
        ...item.parts,
        marketMood: item.parts.marketMood * multiplier + (regime?.returnBias ?? 0),
      },
    };
  });

  return { returns: adjusted, regime };
}

export function getDailyGoalProgress(state: GameState): DailyGoalProgress {
  const config = getDifficultyConfig(state.difficulty);
  const progress = state.dailyProgress?.[state.month] ?? { newsRead: 0, lifeActions: 0 };
  const madeTrade = state.tradeRecords.some((record) => record.month === state.month);
  const lifeUnlocked = state.month >= 2;
  const cashGoalDone = state.cash >= config.cashReserve;

  const items = [
    { id: "news" as const, label: "阅读消息", done: progress.newsRead > 0 },
    { id: "trade" as const, label: "完成交易", done: madeTrade },
    ...(lifeUnlocked ? [{ id: "life" as const, label: "安排生活行动", done: progress.lifeActions > 0 }] : []),
    { id: "cash" as const, label: `保留 ¥${formatShortCash(config.cashReserve)} 现金`, done: cashGoalDone },
  ];

  const completedCount = items.filter((item) => item.done).length;
  return {
    month: state.month,
    items,
    completedCount,
    totalCount: items.length,
    completed: completedCount === items.length,
    points: config.goalPoints,
  };
}

function formatShortCash(value: number) {
  if (value >= 10000) return `${value / 10000}万`;
  if (value >= 1000) return `${value / 1000}千`;
  return String(value);
}

export function buildCausalReview(state: GameState, returns: MonthlyReturn[]) {
  const holdingIds = new Set(state.holdings.map((holding) => holding.etfId));
  const heldReturns = returns.filter((item) => holdingIds.has(item.etfId));
  const best = [...returns].sort((left, right) => right.returnRate - left.returnRate)[0];
  const worst = [...returns].sort((left, right) => left.returnRate - right.returnRate)[0];
  const heldBest = [...heldReturns].sort((left, right) => right.returnRate - left.returnRate)[0];
  const heldWorst = [...heldReturns].sort((left, right) => left.returnRate - right.returnRate)[0];

  if (heldBest && heldWorst) {
    return `因果复盘：你持有的 ${heldBest.etfId} 是组合里最强项，${heldWorst.etfId} 是主要拖累；全市场最强为 ${best?.etfId ?? "暂无"}。`;
  }
  return `因果复盘：你这一天几乎没有持仓暴露，因此避开了 ${worst?.etfId ?? "弱势品种"} 的下跌，也错过了 ${best?.etfId ?? "强势品种"} 的上涨。`;
}
export const dailyChallengeCatalog: DailyChallenge[] = [
  {
    id: "cashGuard",
    title: "现金防线",
    description: "结算时保留足够现金，给自己留出下一日操作空间。",
    rewardPoints: 7,
  },
  {
    id: "focusedTrading",
    title: "克制交易",
    description: "当天至少完成 1 笔交易，但总交易不超过 2 笔。",
    rewardPoints: 6,
  },
  {
    id: "diversify",
    title: "分散配置",
    description: "至少持有 2 只 ETF，且单只 ETF 不超过总资产的 70%。",
    rewardPoints: 8,
  },
  {
    id: "homework",
    title: "先看再做",
    description: "阅读消息，并完成至少一次生活行动。",
    rewardPoints: 7,
  },
  {
    id: "avoidHeat",
    title: "拒绝追热",
    description: "当天完成交易，但不买入任何高波动 ETF。",
    rewardPoints: 8,
  },
];

export function getDailyChallenge(month: number, difficulty: Difficulty): DailyChallenge {
  const eligible = dailyChallengeCatalog.filter((challenge) => challenge.id !== "homework" || month >= 2);
  const difficultyOffset = difficulty === "advanced" ? 2 : difficulty === "standard" ? 1 : 0;
  return eligible[(month * 2 + difficultyOffset) % eligible.length];
}

export function evaluateDailyChallenge(
  challenge: DailyChallenge,
  state: GameState,
): DailyChallengeResult {
  const config = getDifficultyConfig(state.difficulty);
  const todayTrades = state.tradeRecords.filter((record) => record.month === state.month);
  const todayBuys = todayTrades.filter((record) => record.type === "buy");
  const highVolatilityIds = new Set(["ai", "chip", "newEnergy", "lowAltitude"]);
  const highVolatilityBuy = todayBuys.some((record) => highVolatilityIds.has(record.etfId));
  const totalAsset = getTotalAsset(state);
  const topHoldingValue = state.holdings.reduce(
    (max, holding) => Math.max(max, getTotalHoldingValue([holding], state.etfPrices)),
    0,
  );
  const dailyProgress = state.dailyProgress[state.month] ?? { newsRead: 0, lifeActions: 0 };

  let completed = false;
  let progressText = "";

  if (challenge.id === "cashGuard") {
    completed = state.cash >= config.cashReserve + 2000;
    progressText = `结算现金 ¥${Math.round(state.cash).toLocaleString("zh-CN")}，目标至少 ¥${(config.cashReserve + 2000).toLocaleString("zh-CN")}`;
  } else if (challenge.id === "focusedTrading") {
    completed = todayTrades.length >= 1 && todayTrades.length <= 2;
    progressText = `今日交易 ${todayTrades.length} 笔，目标 1~2 笔`;
  } else if (challenge.id === "diversify") {
    const topRatio = totalAsset > 0 ? topHoldingValue / totalAsset : 1;
    completed = state.holdings.length >= 2 && topRatio <= 0.7;
    progressText = `持仓 ${state.holdings.length} 只，最大单一仓位 ${(topRatio * 100).toFixed(1)}%`;
  } else if (challenge.id === "homework") {
    completed = dailyProgress.newsRead > 0 && dailyProgress.lifeActions > 0;
    progressText = `阅读 ${dailyProgress.newsRead} 次，生活行动 ${dailyProgress.lifeActions} 次`;
  } else {
    completed = todayTrades.length > 0 && !highVolatilityBuy;
    progressText = `交易 ${todayTrades.length} 笔，高波动买入 ${highVolatilityBuy ? "有" : "无"}`;
  }

  return {
    challenge,
    completed,
    progressText,
    rewardPoints: completed ? challenge.rewardPoints : 0,
  };
}

const TOWN_STAGES = [
  { level: 1, xp: 0, name: "交易所门口", unlock: "交易所门口" },
  { level: 2, xp: 12, name: "书报小站", unlock: "小镇书报亭" },
  { level: 3, xp: 28, name: "生活服务街", unlock: "生活服务街" },
  { level: 4, xp: 48, name: "研究中心", unlock: "投资研究中心" },
  { level: 5, xp: 72, name: "基金花园", unlock: "基金花园" },
  { level: 6, xp: 100, name: "小镇广场", unlock: "小镇中央广场" },
];

export function createInitialTownProgress(): TownProgress {
  return {
    level: 1,
    xp: 0,
    name: TOWN_STAGES[0].name,
    unlocked: [TOWN_STAGES[0].unlock],
    lastGrowthReason: "小镇刚刚开张，第一间交易所已经点亮。",
  };
}

function getTownStageByXp(xp: number) {
  return [...TOWN_STAGES].reverse().find((stage) => xp >= stage.xp) ?? TOWN_STAGES[0];
}

export function updateTownGrowth(
  progress: TownProgress,
  input: {
    goalCompleted: boolean;
    challengeCompleted: boolean;
    investmentReturnRate: number;
    drawdown: number;
    drawdownLimit: number;
  },
) {
  const goalXp = input.goalCompleted ? 2 : 0;
  const challengeXp = input.challengeCompleted ? 3 : 0;
  const performanceXp = input.investmentReturnRate > 0 ? Math.min(4, Math.max(1, Math.round(input.investmentReturnRate * 100))) : 0;
  const riskXp = input.drawdown <= input.drawdownLimit / 2 ? 1 : 0;
  const xpGained = goalXp + challengeXp + performanceXp + riskXp;
  const nextXp = progress.xp + xpGained;
  const stage = getTownStageByXp(nextXp);
  const unlockedBuilding = stage.level > progress.level ? stage.unlock : undefined;

  const nextProgress: TownProgress = {
    ...progress,
    xp: nextXp,
    level: stage.level,
    name: stage.name,
    unlocked: unlockedBuilding && !progress.unlocked.includes(unlockedBuilding)
      ? [...progress.unlocked, unlockedBuilding]
      : progress.unlocked,
    lastGrowthReason: xpGained > 0 ? `本日获得 ${xpGained} 点小镇成长值。` : "今天小镇没有新增成长值。",
  };

  const result: TownGrowthResult = {
    xpGained,
    level: stage.level,
    leveledUp: stage.level > progress.level,
    unlockedBuilding,
    reason: unlockedBuilding ? `小镇升级，解锁「${unlockedBuilding}」。` : nextProgress.lastGrowthReason ?? "",
  };

  return { progress: nextProgress, result };
}


