import type { DailyChallengeResult, DailyGoalProgress, DailyProgressState, Difficulty, MarketRegime, StrategyExecution, StrategyOrder, TownGrowthResult, TownProgress } from "./gameplay";
export type Screen = "start" | "character-select" | "game" | "month-result" | "final-report";

export type RiskLevel = "低" | "中低" | "中" | "中高" | "高";

export type CharacterId = "student" | "worker" | "uncle";
export type SkillId = "gossipRadar" | "cashFlow" | "riskNotebook";

export type EtfId =
  | "csi300"
  | "dividend"
  | "gold"
  | "nasdaq"
  | "star50"
  | "newEnergy"
  | "chip"
  | "ai"
  | "lowAltitude"
  | "electricPower";

export type MoodState = "normal" | "fear" | "excited";
export type DayPhase = "prep" | "trading";

export type InvestorMetricKey =
  | "fomo"
  | "contrarian"
  | "riskTolerance"
  | "emotionalStability"
  | "decisionSpeed"
  | "informationDependence"
  | "discipline"
  | "cashSecurity";

export type InvestorMetrics = Record<InvestorMetricKey, number>;

export interface InvestorProfile {
  name: string;
  lifeLine: string;
  metrics: InvestorMetrics;
}

export interface MetricChange {
  key: InvestorMetricKey;
  label: string;
  delta: number;
}

export interface DecisionSnapshot {
  day: number;
  windowSeconds: number;
  remainingSeconds: number;
  locked: boolean;
}

export interface DecisionStats {
  records: DecisionSnapshot[];
  totalWindowSeconds: number;
  totalUsedSeconds: number;
  lockedDays: number;
}

export interface LifeEvent {
  id: string;
  title: string;
  description: string;
  cashChange: number;
  mood: "good" | "bad" | "neutral";
  nextDayCashRequired?: number;
  timeCostSeconds?: number;
}

export type LifeActionId = "listenNews" | "dinnerTalk" | "deepResearch" | "lottery" | "focusWork" | "exercise" | "readBook" | "cookMeal";

export interface LifeActionResult {
  id: LifeActionId;
  title: string;
  description: string;
  cashChange: number;
  timeCostSeconds: number;
}

export interface NightIntel {
  id: string;
  source: LifeActionId;
  title: string;
  content: string;
  tone: "bullish" | "bearish" | "neutral";
}

export interface Etf {
  id: EtfId;
  name: string;
  icon: string;
  category: string;
  style: string;
  risk: RiskLevel;
  feature: string;
  baseTrend: number;
  volatility: number;
  dividendYield?: number;
  monthlyBuyLimit?: number;
  highVolatility?: boolean;
}

export interface Character {
  id: CharacterId;
  name: string;
  initialCash: number;
  monthlySalary?: number;
  maxDrawdownLimit: number;
  abilityName: string;
  abilityDescription: string;
  failureStory: string;
}

export interface SkillCard {
  id: SkillId;
  name: string;
  icon: string;
  description: string;
}

export interface MarketEvent {
  id: string;
  month?: number;
  title: string;
  description: string;
  targetEtfs: EtfId[];
  effect: number;
  truthiness: "true" | "reverse" | "noise";
  eventType?: "daily" | "important" | "blackSwan";
  phase?: "overnight" | "today";
  explanation?: string;
  effects?: Partial<Record<EtfId, number>>;
}

export interface ExpertTip {
  id: string;
  month: number;
  speaker: string;
  content: string;
  targetEtf: EtfId;
  direction: "up" | "down";
  confidence: number;
}

export interface IndustryBrief {
  id: string;
  month: number;
  title: string;
  detail: string;
  targetEtfs: EtfId[];
}

export interface Holding {
  etfId: EtfId;
  shares: number;
  cost: number;
}

export interface EtfPricePoint {
  month: number;
  value: number;
}

export interface MonthlyReturn {
  etfId: EtfId;
  returnRate: number;
  dividend: number;
  parts: {
    baseTrend: number;
    marketMood: number;
    volatility: number;
    sectorRotation: number;
    eventEffect: number;
    earningsEffect: number;
    randomNoise: number;
  };
}

export interface MonthResult {
  month: number;
  returns: MonthlyReturn[];
  previousTotalAsset: number;
  currentTotalAsset: number;
  monthlyProfit: number;
  investmentReturnRate: number;
  dividendCash?: number;
  salaryCash?: number;
  lifeEvent?: LifeEvent;
  lifeActions?: LifeActionResult[];
  nightIntel?: NightIntel[];
  metricChanges: MetricChange[];
  dailyGoalProgress?: DailyGoalProgress;
  goalPointsEarned?: number;
  strategyExecutions?: StrategyExecution[];
  marketRegime?: MarketRegime;
  dailyChallengeResult?: DailyChallengeResult;
  townGrowth?: TownGrowthResult;
  causalReview?: string;
  feedback: string;
  story?: string;
}

export interface TradeRecord {
  month: number;
  etfId: EtfId;
  type: "buy" | "sell";
  amount: number;
}

export interface GameState {
  screen: Screen;
  selectedCharacter?: Character;
  month: number;
  dayPhase: DayPhase;
  cash: number;
  contributedCash: number;
  externalCashDelta: number;
  holdings: Holding[];
  etfPrices: Record<EtfId, number>;
  priceHistory: Record<EtfId, EtfPricePoint[]>;
  assetHistory: { month: number; totalAsset: number }[];
  tradeRecords: TradeRecord[];
  titlePoints: number;
  mood: MoodState;
  investorProfile?: InvestorProfile;
  decisionStats: DecisionStats;
  activeLifeEvent?: LifeEvent;
  lifeEventTriggered?: boolean;
  lifeActionHistory: LifeActionResult[];
  difficulty: Difficulty;
  marketSeed?: number;
  dailyProgress: Record<number, DailyProgressState>;
  goalAwardedMonths: number[];
  strategyOrders: StrategyOrder[];
  townProgress: TownProgress;
  activeSaveSlot?: string;
  startedAt?: number;
  lastSavedAt?: number;
  lastMonthResult?: MonthResult;
  gameOverReason?: "cashZero" | "drawdown";
}



