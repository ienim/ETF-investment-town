import type { EtfId } from "./game";
export type Difficulty = "casual" | "standard" | "advanced";
export type StrategyOrderType = "takeProfit" | "stopLoss";

export interface DailyGoalItem {
  id: "news" | "trade" | "life" | "cash";
  label: string;
  done: boolean;
}

export interface DailyGoalProgress {
  month: number;
  items: DailyGoalItem[];
  completedCount: number;
  totalCount: number;
  completed: boolean;
  points: number;
}

export interface StrategyOrder {
  etfId: EtfId;
  type: StrategyOrderType;
  threshold: number;
  sellRatio: number;
  enabled: boolean;
}

export interface StrategyExecution {
  etfId: EtfId;
  type: StrategyOrderType;
  threshold: number;
  returnRate: number;
  soldAmount: number;
}

export interface MarketRegime {
  id: "calm" | "bull" | "bear" | "volatile";
  name: string;
  description: string;
  returnBias: number;
  volatilityMultiplier: number;
}

export interface DailyProgressState {
  newsRead: number;
  lifeActions: number;
}
export type DailyChallengeId = "cashGuard" | "focusedTrading" | "diversify" | "homework" | "avoidHeat";

export interface DailyChallenge {
  id: DailyChallengeId;
  title: string;
  description: string;
  rewardPoints: number;
}

export interface DailyChallengeResult {
  challenge: DailyChallenge;
  completed: boolean;
  progressText: string;
  rewardPoints: number;
}

export interface TownProgress {
  level: number;
  xp: number;
  name: string;
  unlocked: string[];
  lastGrowthReason?: string;
}

export interface TownGrowthResult {
  xpGained: number;
  level: number;
  leveledUp: boolean;
  unlockedBuilding?: string;
  reason: string;
}