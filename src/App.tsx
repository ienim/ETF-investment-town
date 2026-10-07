import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_INITIAL_CASH, TOTAL_MONTHS } from "./data/config";
import {
  applyDifficultyToMonthlyReturns,
  buildCausalReview,
  createInitialTownProgress,
  DEFAULT_DIFFICULTY,
  evaluateDailyChallenge,
  getDailyChallenge,
  getDailyGoalProgress,
  getDifficultyConfig,
  updateTownGrowth,
} from "./data/difficulty";
import { etfs } from "./data/etfs";
import { applyMetricChanges, createInvestorProfile, metricLabels } from "./data/investorProfiles";
import { getLifeEventForDay } from "./data/lifeEvents";
import { FinalReportScreen } from "./screens/FinalReportScreen";
import { GameScreen } from "./screens/GameScreen";
import { MonthResultScreen } from "./screens/MonthResultScreen";
import { StartScreen } from "./screens/StartScreen";
import type {
  DecisionSnapshot,
  EtfId,
  GameState,
  InvestorMetricKey,
  LifeActionResult,
  LifeEvent,
  MetricChange,
  Screen,
} from "./types/game";
import type { Difficulty, StrategyExecution, StrategyOrder, StrategyOrderType } from "./types/gameplay";
import { buildNightIntel, createMonthlyFeedback, createStoryLine } from "./utils/commentaryEngine";
import { generateMonthlyReturns } from "./utils/marketEngine";
import { createMarketSeed, ensureMarketSeed } from "./utils/marketSeed";
import {
  buyHolding,
  createInitialPrices,
  getDrawdown,
  getHoldingValue,
  getPositionRatio,
  getTotalAsset,
  sellHolding,
} from "./utils/portfolio";
import {
  ADVANCED_SEED_SLOT_ID,
  clearAutoSave,
  deleteSaveSlot,
  getSaveSlotLabel,
  getSaveSlotSummaries,
  loadAutoSave,
  loadSaveSlot,
  saveAutoSave,
  saveToSlot,
  type SaveSlotId,
} from "./utils/saveGame";
type FlashTone = "success" | "info" | "warning";

interface FlashMessage {
  id: number;
  text: string;
  tone: FlashTone;
}

function createEmptyPriceHistory(prices: Record<EtfId, number>) {
  return Object.fromEntries(
    Object.entries(prices).map(([etfId, value]) => [etfId, [{ month: 0, value }]]),
  ) as GameState["priceHistory"];
}

function createInitialGameState(): GameState {
  const prices = createInitialPrices(etfs);

  return {
    screen: "start",
    month: 1,
    dayPhase: "prep",
    cash: 0,
    contributedCash: 0,
    externalCashDelta: 0,
    holdings: [],
    etfPrices: prices,
    priceHistory: createEmptyPriceHistory(prices),
    assetHistory: [],
    tradeRecords: [],
    titlePoints: 0,
    mood: "normal",
    investorProfile: undefined,
    decisionStats: {
      records: [],
      totalWindowSeconds: 0,
      totalUsedSeconds: 0,
      lockedDays: 0,
    },
    activeLifeEvent: undefined,
    lifeEventTriggered: false,
    lifeActionHistory: [],
    difficulty: DEFAULT_DIFFICULTY,
    marketSeed: undefined,
    dailyProgress: {},
    goalAwardedMonths: [],
    strategyOrders: [],
    townProgress: createInitialTownProgress(),
  };
}

function normalizeGameState(parsed: Partial<GameState> | null): GameState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const fallback = createInitialGameState();

  return {
    ...fallback,
    ...parsed,
    screen: parsed.screen ?? fallback.screen,
    etfPrices: parsed.etfPrices ?? fallback.etfPrices,
    priceHistory: parsed.priceHistory ?? fallback.priceHistory,
    assetHistory: parsed.assetHistory ?? fallback.assetHistory,
    tradeRecords: parsed.tradeRecords ?? fallback.tradeRecords,
    holdings: parsed.holdings ?? fallback.holdings,
    decisionStats: parsed.decisionStats ?? fallback.decisionStats,
    dayPhase: parsed.dayPhase ?? "prep",
    externalCashDelta: parsed.externalCashDelta ?? 0,
    lifeEventTriggered: parsed.lifeEventTriggered ?? false,
    lifeActionHistory: parsed.lifeActionHistory ?? [],
    difficulty: parsed.difficulty ?? DEFAULT_DIFFICULTY,
    marketSeed: ensureMarketSeed(parsed.marketSeed, parsed.difficulty ?? DEFAULT_DIFFICULTY),
    dailyProgress: parsed.dailyProgress ?? {},
    goalAwardedMonths: parsed.goalAwardedMonths ?? [],
    strategyOrders: parsed.strategyOrders ?? [],
    townProgress: parsed.townProgress ?? createInitialTownProgress(),
  } satisfies GameState;
}

function getInvestmentOnlyAsset(state: Pick<GameState, "cash" | "holdings" | "etfPrices" | "externalCashDelta">) {
  return getTotalAsset(state) - state.externalCashDelta;
}

export default function App() {
  const [savedGame, setSavedGame] = useState<GameState | null>(() => normalizeGameState(loadAutoSave()));
  const [saveSlots, setSaveSlots] = useState(() => getSaveSlotSummaries());
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(savedGame?.difficulty ?? DEFAULT_DIFFICULTY);
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);

  const totalAsset = useMemo(() => getTotalAsset(gameState), [gameState]);
  const investmentAsset = useMemo(() => getInvestmentOnlyAsset(gameState), [gameState]);
  const investmentReturn = useMemo(
    () => (gameState.contributedCash > 0 ? investmentAsset / gameState.contributedCash - 1 : 0),
    [gameState.contributedCash, investmentAsset],
  );
  const maxDrawdown = useMemo(
    () => getDrawdown(gameState.assetHistory.length > 0 ? gameState.assetHistory : [{ totalAsset }]),
    [gameState.assetHistory, totalAsset],
  );

  const refreshSaveSlots = () => setSaveSlots(getSaveSlotSummaries());

  const showFlash = (text: string, tone: FlashTone = "success") => {
    setFlashMessage({ id: Date.now(), text, tone });
  };

  useEffect(() => {
    if (!flashMessage) return undefined;
    const timer = window.setTimeout(() => setFlashMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  useEffect(() => {
    if (gameState.screen === "start" || gameState.screen === "character-select") return;
    const next = { ...gameState, lastSavedAt: Date.now() };
    saveAutoSave(next);
    if (next.activeSaveSlot) {
      saveToSlot(next.activeSaveSlot as SaveSlotId, next);
      refreshSaveSlots();
    }
    setSavedGame(next);
  }, [gameState]);

  const goToScreen = (screen: Screen) => {
    setGameState((current) => ({ ...current, screen }));
  };

  const startGame = (slotId: SaveSlotId) => {
    const difficulty: Difficulty = slotId === ADVANCED_SEED_SLOT_ID ? "advanced" : selectedDifficulty;
    const prices = createInitialPrices(etfs);
    const profile = createInvestorProfile(Date.now());
    const next = {
      ...createInitialGameState(),
      screen: "game",
      cash: DEFAULT_INITIAL_CASH,
      contributedCash: DEFAULT_INITIAL_CASH,
      investorProfile: profile,
      etfPrices: prices,
      priceHistory: createEmptyPriceHistory(prices),
      assetHistory: [{ month: 0, totalAsset: DEFAULT_INITIAL_CASH }],
      activeLifeEvent: getLifeEventForDay(1),
      lifeEventTriggered: false,
      lifeActionHistory: [],
      difficulty,
      marketSeed: difficulty === "advanced" ? createMarketSeed() : undefined,
      activeSaveSlot: slotId,
      startedAt: Date.now(),
    } satisfies GameState;

    setSelectedDifficulty(difficulty);
    setGameState(next);
    setSavedGame(next);
    saveToSlot(slotId, next);
    saveAutoSave(next);
    refreshSaveSlots();
    showFlash(`已开始在「${getSaveSlotLabel(slotId)}」中游戏。`, "success");
  };

  const continueGame = () => {
    const source = savedGame ?? normalizeGameState(loadAutoSave());
    if (!source) {
      showFlash("没有找到可以继续的存档。", "warning");
      return;
    }
    const next = {
      ...source,
      screen: source.screen === "start" || source.screen === "character-select" ? "game" : source.screen,
    } satisfies GameState;
    setGameState(next);
    setSelectedDifficulty(next.difficulty);
    showFlash("已读取上次进度。", "info");
  };

  const loadSlot = (slotId: SaveSlotId) => {
    const loaded = normalizeGameState(loadSaveSlot(slotId));
    if (!loaded) {
      refreshSaveSlots();
      showFlash(`「${getSaveSlotLabel(slotId)}」暂时没有可读取的进度。`, "warning");
      return;
    }
    const next = { ...loaded, activeSaveSlot: slotId } satisfies GameState;
    setGameState(next);
    setSavedGame(next);
    setSelectedDifficulty(next.difficulty);
    saveAutoSave(next);
    refreshSaveSlots();
    showFlash(`已读取「${getSaveSlotLabel(slotId)}」。`, "info");
  };

  const deleteSlot = (slotId: SaveSlotId) => {
    deleteSaveSlot(slotId);
    refreshSaveSlots();
    showFlash(`已删除「${getSaveSlotLabel(slotId)}」。`, "warning");
  };

  const manualSaveGame = () => {
    const slotId = (gameState.activeSaveSlot as SaveSlotId | undefined) ?? "slot-1";
    const next = { ...gameState, activeSaveSlot: slotId, lastSavedAt: Date.now() } satisfies GameState;
    saveToSlot(slotId, next);
    saveAutoSave(next);
    setSavedGame(next);
    refreshSaveSlots();
    showFlash(`已保存到「${getSaveSlotLabel(slotId)}」。`, "success");
  };

  const saveGameToSlot = (slotId: SaveSlotId) => {
    const next = { ...gameState, activeSaveSlot: slotId, lastSavedAt: Date.now() } satisfies GameState;
    saveToSlot(slotId, next);
    saveAutoSave(next);
    setGameState(next);
    setSavedGame(next);
    refreshSaveSlots();
    showFlash(`已保存到「${getSaveSlotLabel(slotId)}」。`, "success");
  };

  const manualLoadGame = () => {
    const auto = normalizeGameState(loadAutoSave());
    const slotId = gameState.activeSaveSlot as SaveSlotId | undefined;
    const slot = slotId ? normalizeGameState(loadSaveSlot(slotId)) : null;
    const loaded = auto ?? slot;
    if (!loaded) {
      showFlash("没有找到可读取的自动存档。", "warning");
      return;
    }
    const next = { ...loaded, activeSaveSlot: loaded.activeSaveSlot ?? slotId } satisfies GameState;
    setGameState(next);
    setSavedGame(next);
    setSelectedDifficulty(next.difficulty);
    showFlash("已读取最近的自动存档。", "info");
  };

  const resetGame = () => {
    clearAutoSave();
    setSavedGame(null);
    setGameState(createInitialGameState());
    refreshSaveSlots();
  };

  const trackNewsRead = () => {
    setGameState((current) => {
      const currentProgress = current.dailyProgress[current.month] ?? { newsRead: 0, lifeActions: 0 };
      return {
        ...current,
        dailyProgress: {
          ...current.dailyProgress,
          [current.month]: { ...currentProgress, newsRead: currentProgress.newsRead + 1 },
        },
      };
    });
  };

  const trackLifeAction = (action: LifeActionResult) => {
    setGameState((current) => {
      const currentProgress = current.dailyProgress[current.month] ?? { newsRead: 0, lifeActions: 0 };
      return {
        ...current,
        lifeActionHistory: [...(current.lifeActionHistory ?? []), action],
        dailyProgress: {
          ...current.dailyProgress,
          [current.month]: { ...currentProgress, lifeActions: currentProgress.lifeActions + 1 },
        },
      };
    });
  };

  const buyEtf = (etfId: EtfId, amount: number) => {
    setGameState((current) => {
      const etf = etfs.find((item) => item.id === etfId);
      if (!etf || amount <= 0 || amount > current.cash) return current;

      const boughtThisMonth = current.tradeRecords
        .filter((record) => record.month === current.month && record.etfId === etfId && record.type === "buy")
        .reduce((sum, record) => sum + record.amount, 0);

      if (etf.monthlyBuyLimit && boughtThisMonth + amount > etf.monthlyBuyLimit) return current;

      return {
        ...current,
        cash: current.cash - amount,
        holdings: buyHolding(current.holdings, current.etfPrices, etfId, amount),
        tradeRecords: [...current.tradeRecords, { month: current.month, etfId, type: "buy", amount }],
      };
    });
  };

  const sellEtf = (etfId: EtfId, amount: number) => {
    setGameState((current) => {
      const holding = current.holdings.find((item) => item.etfId === etfId);
      if (!holding || amount <= 0) return current;

      const holdingValue = getHoldingValue(holding, current.etfPrices);
      const boughtToday = current.tradeRecords
        .filter((record) => record.month === current.month && record.etfId === etfId && record.type === "buy")
        .reduce((sum, record) => sum + record.amount, 0);
      const sellableValue = Math.max(0, holdingValue - boughtToday);

      if (amount > sellableValue) return current;

      return {
        ...current,
        cash: current.cash + amount,
        holdings: sellHolding(current.holdings, current.etfPrices, etfId, amount),
        tradeRecords: [...current.tradeRecords, { month: current.month, etfId, type: "sell", amount }],
      };
    });
  };

  const adjustCash = (amount: number) => {
    setGameState((current) => ({
      ...current,
      cash: Math.max(0, current.cash + amount),
      externalCashDelta: current.externalCashDelta + amount,
    }));
  };

  const startTradingDay = () => {
    setGameState((current) => ({
      ...current,
      dayPhase: "trading",
    }));
  };

  const triggerLifeEvent = (lifeEvent: LifeEvent) => {
    setGameState((current) => ({
      ...current,
      cash: current.cash + lifeEvent.cashChange,
      externalCashDelta: current.externalCashDelta + (lifeEvent.cashChange < 0 ? lifeEvent.cashChange * 1.3 : lifeEvent.cashChange),
      lifeEventTriggered: true,
    }));
  };

  const setStrategyOrder = (etfId: EtfId, type: StrategyOrderType, threshold: number) => {
    setGameState((current) => {
      if (!getDifficultyConfig(current.difficulty).enableStrategyOrders) return current;
      const existingIndex = current.strategyOrders.findIndex((order) => order.etfId === etfId);
      const nextOrder: StrategyOrder = {
        etfId,
        type,
        threshold,
        sellRatio: type === "takeProfit" ? 0.5 : 0.7,
        enabled: true,
      };
      const nextOrders = [...current.strategyOrders];
      if (existingIndex >= 0) nextOrders[existingIndex] = nextOrder;
      else nextOrders.push(nextOrder);
      return { ...current, strategyOrders: nextOrders };
    });
  };

  const clearStrategyOrder = (etfId: EtfId) => {
    setGameState((current) => ({
      ...current,
      strategyOrders: current.strategyOrders.filter((order) => order.etfId !== etfId),
    }));
  };

  const settleCurrentMonth = (decisionSnapshot?: DecisionSnapshot, lifeActions?: LifeActionResult[]) => {
    setGameState((current) => {
      const config = getDifficultyConfig(current.difficulty);
      const previousTotalAsset = getTotalAsset(current);
      const previousInvestmentAsset = getInvestmentOnlyAsset(current);
      const rawReturns = generateMonthlyReturns(etfs, current.month, current.marketSeed);
      const { returns: monthlyReturns, regime } = applyDifficultyToMonthlyReturns(
        rawReturns,
        current.month,
        current.difficulty,
        etfs,
        current.marketSeed,
      );
      const returnMap = new Map(monthlyReturns.map((item) => [item.etfId, item]));

      let dividendCash = 0;
      const nextPrices = { ...current.etfPrices };
      const nextPriceHistory = { ...current.priceHistory };

      etfs.forEach((etf) => {
        const monthlyReturn = returnMap.get(etf.id);
        if (!monthlyReturn) return;
        nextPrices[etf.id] = Math.max(0.1, current.etfPrices[etf.id] * (1 + monthlyReturn.returnRate));
        nextPriceHistory[etf.id] = [...current.priceHistory[etf.id], { month: current.month, value: nextPrices[etf.id] }];

        const holding = current.holdings.find((item) => item.etfId === etf.id);
        if (holding && monthlyReturn.dividend > 0) {
          dividendCash += getHoldingValue(holding, current.etfPrices) * monthlyReturn.dividend;
        }
      });

      const nextStrategyOrders = current.strategyOrders.map((order) => ({ ...order }));
      const strategyExecutions: StrategyExecution[] = [];
      let strategyCash = 0;

      const holdingsAfterStrategy = current.holdings
        .map((holding) => {
          if (!config.enableStrategyOrders) return holding;
          const order = nextStrategyOrders.find((candidate) => candidate.etfId === holding.etfId && candidate.enabled);
          const monthlyReturn = returnMap.get(holding.etfId);
          if (!order || !monthlyReturn) return holding;

          const triggered = order.type === "takeProfit"
            ? monthlyReturn.returnRate >= order.threshold
            : monthlyReturn.returnRate <= order.threshold;
          if (!triggered) return holding;

          const soldAmount = getHoldingValue(holding, nextPrices) * order.sellRatio;
          strategyCash += soldAmount;
          strategyExecutions.push({
            etfId: holding.etfId,
            type: order.type,
            threshold: order.threshold,
            returnRate: monthlyReturn.returnRate,
            soldAmount,
          });
          order.enabled = false;
          return {
            ...holding,
            shares: holding.shares * (1 - order.sellRatio),
            cost: holding.cost * (1 - order.sellRatio),
          };
        })
        .filter((holding) => holding.shares > 0.000001);

      const strategyTradeRecords = strategyExecutions.map((execution) => ({
        month: current.month,
        etfId: execution.etfId,
        type: "sell" as const,
        amount: execution.soldAmount,
      }));

      const stateAfterMarket = {
        ...current,
        cash: current.cash + dividendCash + strategyCash,
        holdings: holdingsAfterStrategy,
        etfPrices: nextPrices,
        priceHistory: nextPriceHistory,
        tradeRecords: [...current.tradeRecords, ...strategyTradeRecords],
        strategyOrders: nextStrategyOrders,
      };

      const currentTotalAsset = getTotalAsset(stateAfterMarket);
      const currentInvestmentAsset = getInvestmentOnlyAsset(stateAfterMarket);
      const monthlyProfit = currentTotalAsset - previousTotalAsset;
      const investmentReturnRate =
        previousInvestmentAsset > 0 ? (currentInvestmentAsset - previousInvestmentAsset) / previousInvestmentAsset : 0;

      const metricChanges = createMetricChanges(current, investmentReturnRate, lifeActions?.length ?? 0);
      const lifeEvent = current.lifeEventTriggered ? current.activeLifeEvent : undefined;
      const lifeCash = lifeEvent?.cashChange ?? 0;

      if (lifeCash > 0) addMetricChange(metricChanges, "emotionalStability", 1);
      if (lifeCash < 0) {
        addMetricChange(metricChanges, "cashSecurity", -1);
        addMetricChange(metricChanges, "emotionalStability", -1);
      }

      lifeActions?.forEach((lifeAction) => {
        addMetricChange(metricChanges, "informationDependence", 1);
        if (lifeAction.id === "deepResearch") addMetricChange(metricChanges, "discipline", 1);
        if (lifeAction.id === "focusWork") addMetricChange(metricChanges, "emotionalStability", 1);
        if (lifeAction.cashChange < 0) addMetricChange(metricChanges, "cashSecurity", -1);
      });

      const nextInvestorProfile = current.investorProfile
        ? {
            ...current.investorProfile,
            metrics: applyMetricChanges(current.investorProfile.metrics, metricChanges),
          }
        : undefined;

      const nextDecisionStats = decisionSnapshot
        ? {
            records: [...current.decisionStats.records, decisionSnapshot],
            totalWindowSeconds: current.decisionStats.totalWindowSeconds + decisionSnapshot.windowSeconds,
            totalUsedSeconds:
              current.decisionStats.totalUsedSeconds +
              Math.max(0, decisionSnapshot.windowSeconds - decisionSnapshot.remainingSeconds),
            lockedDays: current.decisionStats.lockedDays + (decisionSnapshot.locked ? 1 : 0),
          }
        : current.decisionStats;

      const dailyGoalProgress = getDailyGoalProgress(stateAfterMarket);
      const shouldAwardGoal =
        config.enableDailyGoals && dailyGoalProgress.completed && !current.goalAwardedMonths.includes(current.month);
      const goalPointsEarned = shouldAwardGoal ? dailyGoalProgress.points : 0;
      const nextGoalAwardedMonths = shouldAwardGoal
        ? [...current.goalAwardedMonths, current.month]
        : current.goalAwardedMonths;

      const dailyChallenge = getDailyChallenge(current.month, current.difficulty);
      const dailyChallengeResult = evaluateDailyChallenge(dailyChallenge, stateAfterMarket);
      const challengePointsEarned = dailyChallengeResult.rewardPoints;

      const nextAssetHistory = [...current.assetHistory, { month: current.month, totalAsset: currentTotalAsset }];
      const nextDrawdown = getDrawdown(nextAssetHistory);
      const townGrowth = updateTownGrowth(current.townProgress ?? createInitialTownProgress(), {
        goalCompleted: dailyGoalProgress.completed,
        challengeCompleted: dailyChallengeResult.completed,
        investmentReturnRate,
        drawdown: nextDrawdown,
        drawdownLimit: config.maxDrawdownLimit,
      });

      const nextState = {
        ...stateAfterMarket,
        investorProfile: nextInvestorProfile,
        titlePoints: current.titlePoints + goalPointsEarned + challengePointsEarned,
        goalAwardedMonths: nextGoalAwardedMonths,
        townProgress: townGrowth.progress,
        assetHistory: nextAssetHistory,
        decisionStats: nextDecisionStats,
        screen: "month-result" as const,
      };

      const failedByCash = currentTotalAsset <= 0;
      const failedByDrawdown = nextDrawdown > config.maxDrawdownLimit;
      const feedback = createMonthlyFeedback({
        profit: monthlyProfit,
        investmentReturnRate,
        monthlyReturns,
        lifeEvent,
      });
      const causalReview = config.enableCausalReview ? buildCausalReview(current, monthlyReturns) : "";
      const challengeFeedback = dailyChallengeResult.completed
        ? `每日挑战「${dailyChallenge.title}」完成，获得 ${challengePointsEarned} 枚小镇徽章。`
        : `每日挑战「${dailyChallenge.title}」未完成：${dailyChallengeResult.progressText}。`;
      const townFeedback = townGrowth.result.leveledUp
        ? `小镇升级到 Lv.${townGrowth.result.level}，解锁「${townGrowth.result.unlockedBuilding ?? townGrowth.progress.name}」。`
        : `小镇成长 +${townGrowth.result.xpGained}，当前 Lv.${townGrowth.result.level}「${townGrowth.progress.name}」。`;
      const combinedFeedback = [
        feedback,
        regime ? `市场环境：${regime.name}。${regime.description}` : "",
        causalReview,
        challengeFeedback,
        townFeedback,
      ].filter(Boolean).join(" ");

      return {
        ...nextState,
        gameOverReason: failedByCash ? "cashZero" : failedByDrawdown ? "drawdown" : undefined,
        lastMonthResult: {
          month: current.month,
          returns: monthlyReturns,
          previousTotalAsset,
          currentTotalAsset,
          monthlyProfit,
          investmentReturnRate,
          dividendCash,
          lifeEvent,
          lifeActions,
          nightIntel: buildNightIntel(current.month, monthlyReturns, lifeActions),
          metricChanges: toMetricChangeLabels(metricChanges),
          dailyGoalProgress,
          goalPointsEarned,
          strategyExecutions,
          marketRegime: regime,
          dailyChallengeResult,
          townGrowth: townGrowth.result,
          causalReview: combinedFeedback,
          feedback: combinedFeedback,
          story: createStoryLine({
            failedByCash,
            failedByDrawdown,
            monthlyProfit,
            lifeEvent,
            monthlyReturns,
          }),
        },
      } satisfies GameState;
    });
  };

  const goNextMonth = () => {
    setGameState((current) => {
      if (current.gameOverReason || current.month >= TOTAL_MONTHS) {
        return { ...current, screen: "final-report" };
      }

      const nextMonth = current.month + 1;
      return {
        ...current,
        month: nextMonth,
        dayPhase: "prep",
        screen: "game",
        activeLifeEvent: getLifeEventForDay(nextMonth),
        lifeEventTriggered: false,
        lifeActionHistory: [],
      };
    });
  };

  const skipToReport = () => {
    setGameState((current) => ({
      ...current,
      screen: "final-report",
    }));
  };

  let content: ReactNode;
  if (gameState.screen === "start" || gameState.screen === "character-select") {
    content = (
      <StartScreen
        hasSavedGame={Boolean(savedGame)}
        onContinue={continueGame}
        onDeleteSlot={deleteSlot}
        onLoadSlot={loadSlot}
        onSelectDifficulty={setSelectedDifficulty}
        onStart={startGame}
        saveSlots={saveSlots}
        selectedDifficulty={selectedDifficulty}
      />
    );
  } else if (gameState.screen === "month-result") {
    content = <MonthResultScreen gameState={gameState} onEndGame={() => goToScreen("final-report")} onNextMonth={goNextMonth} />;
  } else if (gameState.screen === "final-report") {
    content = <FinalReportScreen gameState={gameState} onRestart={resetGame} />;
  } else {
    content = (
      <GameScreen
        etfs={etfs}
        gameState={gameState}
        investmentReturn={investmentReturn}
        maxDrawdown={maxDrawdown}
        totalAsset={totalAsset}
        onAdjustCash={adjustCash}
        onBuy={buyEtf}
        onClearStrategyOrder={clearStrategyOrder}
        onManualLoad={manualLoadGame}
        onManualSave={manualSaveGame}
        onRestart={resetGame}
        onSell={sellEtf}
        onSetStrategyOrder={setStrategyOrder}
        onSettleMonth={settleCurrentMonth}
        onStartTradingDay={startTradingDay}
        onTrackDailyNews={trackNewsRead}
        onTriggerLifeEvent={triggerLifeEvent}
        onSkipToReport={skipToReport}
        onTrackLifeAction={trackLifeAction}
        saveSlots={saveSlots}
        activeSaveSlot={gameState.activeSaveSlot as SaveSlotId | undefined}
        onSaveToSlot={saveGameToSlot}
        onLoadSlot={loadSlot}
      />
    );
  }

  return (
    <>
      {content}
      {flashMessage ? (
        <div key={flashMessage.id} className={`save-toast save-toast--${flashMessage.tone}`} role="status" aria-live="polite">
          <span>{flashMessage.text}</span>
        </div>
      ) : null}
    </>
  );
}

function addMetricChange(changes: { key: InvestorMetricKey; delta: number }[], key: InvestorMetricKey, delta: number) {
  const existing = changes.find((change) => change.key === key);
  if (existing) existing.delta += delta;
  else changes.push({ key, delta });
}

function createMetricChanges(current: GameState, dailyReturnRate: number, lifeActionCount = 0) {
  const changes: { key: InvestorMetricKey; delta: number }[] = [];
  const todayTrades = current.tradeRecords.filter((record) => record.month === current.month);
  const todayBuys = todayTrades.filter((record) => record.type === "buy");
  const highVolatilityBuy = todayBuys.some((record) => etfs.find((etf) => etf.id === record.etfId)?.highVolatility);
  const positionRatio = getPositionRatio(current);

  if (todayTrades.length >= 3) {
    addMetricChange(changes, "decisionSpeed", 2);
    addMetricChange(changes, "discipline", -1);
  }

  if (highVolatilityBuy) {
    addMetricChange(changes, "fomo", 2);
    addMetricChange(changes, "riskTolerance", 1);
  }

  if (positionRatio >= 0.85) {
    addMetricChange(changes, "riskTolerance", 2);
    addMetricChange(changes, "cashSecurity", -2);
  }

  if (positionRatio <= 0.35) {
    addMetricChange(changes, "cashSecurity", 1);
    addMetricChange(changes, "discipline", 1);
  }

  if (lifeActionCount > 0) {
    addMetricChange(changes, "informationDependence", Math.min(2, lifeActionCount));
  }

  if (dailyReturnRate < -0.02 && todayBuys.length > 0) {
    addMetricChange(changes, "contrarian", 2);
  }

  if (dailyReturnRate < -0.03) {
    addMetricChange(changes, "emotionalStability", -2);
  }

  if (changes.length === 0) addMetricChange(changes, "emotionalStability", 1);
  return changes;
}

function toMetricChangeLabels(changes: { key: InvestorMetricKey; delta: number }[]): MetricChange[] {
  return changes
    .filter((change) => change.key !== "fomo")
    .map((change) => ({
      ...change,
      label: metricLabels[change.key],
    }));
}








