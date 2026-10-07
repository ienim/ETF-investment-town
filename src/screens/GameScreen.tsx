import { PortfolioOverview } from "../components/PortfolioOverview";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { HoldingList } from "../components/HoldingList";
import { LineTrendChart } from "../components/LineTrendChart";
import { PixelAvatar } from "../components/PixelAvatar";
import { PixelButton } from "../components/PixelButton";
import { StatCard } from "../components/StatCard";
import {
  InfoModalWindow,
  LifeActionPanel,
  ModalFrame,
  ToastBanner,
  enrichMarketEvent,
  getBriefsForDay,
  getLifeActionTag,
  getTipsForDay,
} from "../components/GameInfoWindows";
import { TOTAL_MONTHS } from "../data/config";
import { getDailyChallenge, getDailyGoalProgress, getDifficultyConfig } from "../data/difficulty";
import { etfs as etfCatalog } from "../data/etfs";
import { getDailyMarketEvents } from "../data/events";
import { lifeActions, type LifeActionOption } from "../data/lifeActions";
import type {
  DecisionSnapshot,
  Etf,
  EtfId,
  GameState,
  LifeActionResult,
  LifeEvent,
  MarketEvent,
} from "../types/game";
import type { StrategyOrderType } from "../types/gameplay";
import { buildGeneratedTips, buildGuideLine, type GeneratedTip } from "../utils/commentaryEngine";
import { generateFactorScores, type FactorScore } from "../utils/factorEngine";
import { formatMoney, formatPercent, getHoldingValue, getPositionRatio } from "../utils/portfolio";
import type { SaveSlotId, SaveSlotSummary } from "../utils/saveGame";

type ModalType = "trade" | "life" | "signals" | "etfs" | null;
type ToastTone = "info" | "success" | "warning";

type SignalItem = {
  id: string;
  title: string;
  description: string;
  phase: "隔夜要闻" | "今日要闻";
  category: "日常事件卡" | "重要事件卡" | "黑天鹅事件卡" | "市场噪声卡";
};

type TipItem = GeneratedTip;
type BriefItem = { id: string; title: string; detail: string; targetEtfs?: string[] };

type TutorialCard = {
  id: string;
  title: string;
  text: string;
  target?: "signals" | "startDay" | "trade" | "buy20k" | "life" | "etfs" | "settle";
  actionLabel?: string;
  onAction?: () => void;
};

const EVENT_DROP_WINDOW_SECONDS = 90;

interface GameScreenProps {
  etfs: Etf[];
  gameState: GameState;
  totalAsset: number;
  investmentReturn: number;
  maxDrawdown: number;
  onBuy: (etfId: EtfId, amount: number) => void;
  onSell: (etfId: EtfId, amount: number) => void;
  onAdjustCash: (amount: number) => void;
  onSettleMonth: (decisionSnapshot?: DecisionSnapshot, lifeActions?: LifeActionResult[]) => void;
  onRestart: () => void;
  onStartTradingDay: () => void;
  onTriggerLifeEvent: (lifeEvent: LifeEvent) => void;
  onSkipToReport?: () => void;
  onTrackLifeAction?: (action: LifeActionResult) => void;
  onTrackDailyNews?: () => void;
  onSetStrategyOrder?: (etfId: EtfId, type: StrategyOrderType, threshold: number) => void;
  onClearStrategyOrder?: (etfId: EtfId) => void;
  onManualSave?: () => void;
  onManualLoad?: () => void;
  saveSlots: SaveSlotSummary[];
  activeSaveSlot?: SaveSlotId;
  onSaveToSlot: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
}

export function GameScreen({
  etfs,
  gameState,
  totalAsset,
  investmentReturn,
  maxDrawdown,
  onBuy,
  onSell,
  onAdjustCash,
  onSettleMonth,
  onRestart: _onRestart,
  onStartTradingDay,
  onTriggerLifeEvent,
  onSkipToReport,
  onTrackLifeAction,
  onTrackDailyNews,
  onSetStrategyOrder,
  onClearStrategyOrder,
  onManualSave: _onManualSave,
  onManualLoad: _onManualLoad,
  saveSlots,
  activeSaveSlot,
  onSaveToSlot,
  onLoadSlot,
}: GameScreenProps) {
  const difficultyConfig = getDifficultyConfig(gameState.difficulty);
  const daySeconds = difficultyConfig.daySeconds;
  const [selectedEtfId, setSelectedEtfId] = useState<EtfId>("csi300");
  const [amountText, setAmountText] = useState("1000");
  const [modal, setModal] = useState<ModalType>(null);
  const [saveDialogMode, setSaveDialogMode] = useState<"save" | "load" | null>(null);
  const [selectedLifeActions, setSelectedLifeActions] = useState<LifeActionResult[]>([]);
  const [revealedTodayNewsCount, setRevealedTodayNewsCount] = useState(0);
  const [dayCountdown, setDayCountdown] = useState(daySeconds);
  const [marketLocked, setMarketLocked] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string; tone: ToastTone } | null>(null);
  const [lifeEventPopup, setLifeEventPopup] = useState<LifeEvent | null>(null);
  const [selectedEtfGuideDetail, setSelectedEtfGuideDetail] = useState<EtfId | null>(null);
  const [tutorialFlags, setTutorialFlags] = useState<Record<string, boolean>>({});
  const [dismissedTutorials, setDismissedTutorials] = useState<Record<string, boolean>>({});

  const autoSettledRef = useRef(false);
  const selectedLifeActionsRef = useRef<LifeActionResult[]>([]);
  const toastTimerRef = useRef<number | null>(null);
  const lifeEventPopupTimerRef = useRef<number | null>(null);

  const showLifeActions = gameState.month >= 2;
  const showTrend = gameState.month >= 2;
  const isPrepPhase = gameState.dayPhase === "prep";
  const isTradingPhase = gameState.dayPhase === "trading";
  const tutorialLocked = gameState.month <= 2;

  const rawMarketEvents = useMemo(() => getDailyMarketEvents(gameState.month), [gameState.month]);
  const allMarketEvents = useMemo(
    () => rawMarketEvents.map((event, index) => enrichMarketEvent(event, index)),
    [rawMarketEvents],
  );
  const factorScores = useMemo(() => generateFactorScores(etfs, gameState), [etfs, gameState]);
  const overnightEvents = allMarketEvents.filter((event) => event.phase === "隔夜要闻");
  const todayEvents = allMarketEvents.filter((event) => event.phase === "今日要闻");
  const revealedTodayEvents = todayEvents.slice(0, revealedTodayNewsCount);
  const signalItems = isPrepPhase ? overnightEvents : [...overnightEvents, ...revealedTodayEvents];
  const monthTips = getTipsForDay(gameState.month, factorScores, rawMarketEvents, gameState);
  const monthBriefs = getBriefsForDay(gameState.month);
  const displaySignalItems = gameState.month === 1 ? signalItems.slice(0, 1) : signalItems;
  const displayMonthTips = gameState.month === 1 ? monthTips.slice(0, 1) : monthTips;
  const displayMonthBriefs = gameState.month === 1 ? [] : monthBriefs;
  const selectedEtf = etfs.find((etf) => etf.id === selectedEtfId) ?? etfs[0];
  const selectedScore = factorScores.find((item) => item.etfId === selectedEtfId);
  const pendingCashRequirement =
    gameState.lastMonthResult?.month === gameState.month - 1
      ? gameState.lastMonthResult.lifeEvent?.nextDayCashRequired
      : undefined;
  const nextDayTimePenalty =
    pendingCashRequirement && gameState.cash < pendingCashRequirement
      ? Math.min(35, 10 + Math.ceil((pendingCashRequirement - gameState.cash) / 1000) * 4)
      : 0;

  const boughtThisMonth = useMemo(() =>
    gameState.tradeRecords
      .filter((r) => r.month === gameState.month && r.etfId === selectedEtfId && r.type === "buy")
      .reduce((s, r) => s + r.amount, 0),
    [gameState.month, gameState.tradeRecords, selectedEtfId]
  );

  const hasBoughtThisMonth = useMemo(() =>
    gameState.tradeRecords.some((r) => r.month === gameState.month && r.type === "buy"),
    [gameState.month, gameState.tradeRecords]
  );

  const boughtCashThisMonth = useMemo(
    () =>
      gameState.tradeRecords
        .filter((record) => record.month === gameState.month && record.type === "buy")
        .reduce((sum, record) => sum + record.amount, 0),
    [gameState.month, gameState.tradeRecords],
  );

  const selectedHoldingValue = useMemo(() => {
    const h = gameState.holdings.find((item) => item.etfId === selectedEtfId);
    return h ? getHoldingValue(h, gameState.etfPrices) : 0;
  }, [gameState.etfPrices, gameState.holdings, selectedEtfId]);

  const boughtSelectedToday = useMemo(() =>
    gameState.tradeRecords
      .filter((r) => r.month === gameState.month && r.etfId === selectedEtfId && r.type === "buy")
      .reduce((s, r) => s + r.amount, 0),
    [gameState.month, gameState.tradeRecords, selectedEtfId]
  );

  const sellableHoldingValue = Math.max(0, selectedHoldingValue - boughtSelectedToday);
  const tradeAmount = Number(amountText);
  const remainingMonthlyLimit = selectedEtf.monthlyBuyLimit
    ? Math.max(0, selectedEtf.monthlyBuyLimit - boughtThisMonth)
    : undefined;
  const countdownText = tutorialLocked && isTradingPhase ? "不计时" : marketLocked ? "00:00" : formatClock(dayCountdown);
  const droppedAllTodayNews = revealedTodayNewsCount >= todayEvents.length;
  const isFinalCountdown = isTradingPhase && !tutorialLocked && !marketLocked && dayCountdown <= 10;
  const dailyGoalProgress = getDailyGoalProgress(gameState);
  const dailyChallenge = getDailyChallenge(gameState.month, gameState.difficulty);
  const selectedStrategyOrder = gameState.strategyOrders.find((order) => order.etfId === selectedEtfId);

  const showToast = (text: string, tone: ToastTone) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    const next = { id: Date.now(), text, tone };
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === next.id ? null : current));
    }, 2200);
  };

  const openModal = (nextModal: ModalType) => {
    if (nextModal === "signals") onTrackDailyNews?.();
    setModal(nextModal);
  };

  const handleStartTradingDay = () => {
    // tutorial auto-detects from state
    onStartTradingDay();
    showToast(tutorialLocked ? "教学交易日已开始：本日不计时，完成引导后请手动结算。" : "交易日开始，" + Math.round(daySeconds / 60) + " 分钟倒计时启动。", "info");
  };

  const markTutorial = (key: string) => {
    setTutorialFlags((current) => (current[key] ? current : { ...current, [key]: true }));
  };

  const dismissTutorial = (key: string) => {
    setDismissedTutorials((current) => ({ ...current, [key]: true }));
  };

  useEffect(() => {
    setRevealedTodayNewsCount(0);
    setDayCountdown(Math.max(45, daySeconds - nextDayTimePenalty));
    setMarketLocked(false);
    setSelectedLifeActions([]);
    setLifeEventPopup(null);
    setSelectedEtfGuideDetail(null);
    setDismissedTutorials({});
    selectedLifeActionsRef.current = [];
    autoSettledRef.current = false;
    showToast(
      gameState.month === 1
        ? "第 1 天先学会看消息、开始交易日和建第一笔仓。"
        : gameState.month === 2
          ? "第 2 天开始学评分、走势和第一次调仓。"
        : gameState.month === 3
            ? "第 3 天开始，房租和生活波动会认真打断你的节奏。"
            : gameState.month === 5
              ? "从今天开始，提示会变少，市场和生活都不会再让着你。"
            : "先看隔夜消息，再决定什么时候开始今天的交易。",
      "info",
    );
    if (nextDayTimePenalty > 0) {
      showToast(`昨晚留给生活的现金不够，今天白天少了 ${nextDayTimePenalty} 秒。`, "warning");
    }
  }, [gameState.month, nextDayTimePenalty]);

  useEffect(() => {
    if (!isTradingPhase) return;
    const dropTimers = todayEvents.map((_, index) => {
      const baseDelay = index === 0 ? 12000 : 42000;
      const randomDelay = Math.floor(seededUiRandom(gameState.month * (19 + index * 7)) * 36000);
      const cappedDelay = Math.min((EVENT_DROP_WINDOW_SECONDS - 6) * 1000, baseDelay + randomDelay);
      return window.setTimeout(() => {
        setRevealedTodayNewsCount((count) => Math.max(count, index + 1));
        showToast(index === 0 ? "交易时又有新的新闻。" : "交易时又刷出一条新消息。", "warning");
      }, cappedDelay);
    });
    return () => dropTimers.forEach((timer) => window.clearTimeout(timer));
  }, [gameState.month, isTradingPhase, todayEvents.length]);

  useEffect(() => {
    if (!isPrepPhase || gameState.lifeEventTriggered || !gameState.activeLifeEvent) return;
    const lifeEvent = gameState.activeLifeEvent as LifeEvent;
    const cashChange = lifeEvent.cashChange ?? 0;
    const timeCost = (lifeEvent as any).timeCostSeconds ?? 0;
    const timer = window.setTimeout(() => {
      if (timeCost > 0 && !tutorialLocked) {
        setDayCountdown((s) => Math.max(0, s - timeCost));
      }
      onTriggerLifeEvent(lifeEvent);
      setLifeEventPopup(lifeEvent);
      showToast(
        lifeEvent.title + "，" + (cashChange >= 0 ? "+" : "-") + "¥" + formatMoney(Math.abs(cashChange)) + (timeCost > 0 ? (tutorialLocked ? "，教学期不占用倒计时" : "，今天一早先耗掉 " + timeCost + " 秒") : ""),
        cashChange < 0 ? "warning" : "success",
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [gameState.activeLifeEvent, gameState.lifeEventTriggered, isPrepPhase, onTriggerLifeEvent, tutorialLocked]);

  useEffect(() => {
    if (!isTradingPhase || marketLocked || tutorialLocked) return;
    if (dayCountdown <= 0) {
      setMarketLocked(true);
      showToast("白天时间结束，自动进入晚间结算。", "warning");
      if (!autoSettledRef.current) {
        autoSettledRef.current = true;
        onSettleMonth(
          { day: gameState.month, windowSeconds: daySeconds, remainingSeconds: 0, locked: true },
          selectedLifeActionsRef.current,
        );
      }
      return;
    }
    const timer = window.setTimeout(() => setDayCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [dayCountdown, gameState.month, isTradingPhase, marketLocked, onSettleMonth, tutorialLocked]);

  useEffect(() => {
    return () => { if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); };
  }, []);

  useEffect(() => {
    if (lifeEventPopupTimerRef.current) {
      window.clearTimeout(lifeEventPopupTimerRef.current);
      lifeEventPopupTimerRef.current = null;
    }
    if (!lifeEventPopup) return;
    lifeEventPopupTimerRef.current = window.setTimeout(() => {
      setLifeEventPopup((current) => (current?.id === lifeEventPopup.id ? null : current));
    }, 4200);
    return () => {
      if (lifeEventPopupTimerRef.current) {
        window.clearTimeout(lifeEventPopupTimerRef.current);
        lifeEventPopupTimerRef.current = null;
      }
    };
  }, [lifeEventPopup]);

  const dismissToast = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const handleBuy = () => {
    if (!isTradingPhase) return showToast("先看完隔夜信息，再手动开始今天的交易。", "warning");
    if (marketLocked) return showToast("今天的市场已经收盘，不能再买入了。", "warning");
    if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) return showToast("请输入大于 0 的买入份额。", "warning");
    const buyCost = tradeAmount * gameState.etfPrices[selectedEtfId];
    if (buyCost > gameState.cash) return showToast("现金不够，先给自己留一点安全垫。", "warning");
    if (remainingMonthlyLimit !== undefined && buyCost > remainingMonthlyLimit) {
      return showToast("纳指今天还最多可买 " + formatMoney(remainingMonthlyLimit / gameState.etfPrices[selectedEtfId]) + " 份。", "warning");
    }
    onBuy(selectedEtfId, buyCost);
    showToast("买入 " + selectedEtf.name + " " + tradeAmount + " 份，共 ¥" + formatMoney(buyCost) + "。", "success");
  };

  const handleSell = () => {
    if (!isTradingPhase) return showToast("先开始交易日，才能卖出。", "warning");
    if (marketLocked) return showToast("今天的市场已经收盘，不能再卖出了。", "warning");
    if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) return showToast("请输入大于 0 的卖出份额。", "warning");
    const sellValue = tradeAmount * gameState.etfPrices[selectedEtfId];
    if (sellValue > sellableHoldingValue) return showToast(selectedEtf.name + " 今天新增部分不能立刻卖出。", "warning");
    onSell(selectedEtfId, sellValue);
    showToast("卖出 " + selectedEtf.name + " " + tradeAmount + " 份，共 ¥" + formatMoney(sellValue) + "。", "success");
  };

  const adjustTradeAmount = (delta: number) => {
    const currentAmount = Number(amountText);
    setAmountText(String(Math.max(0, (Number.isFinite(currentAmount) ? currentAmount : 0) + delta)));
  };

  const handleSettle = () => {
    if (!isTradingPhase) return showToast("还没开始今天的交易日。", "warning");
    const snapshot: DecisionSnapshot = {
      day: gameState.month,
      windowSeconds: daySeconds,
      remainingSeconds: tutorialLocked ? daySeconds : marketLocked ? 0 : dayCountdown,
      locked: marketLocked,
    };
    onSettleMonth(snapshot, selectedLifeActions);
  };

  const chooseLifeAction = (option: LifeActionOption) => {
    if (!showLifeActions) return showToast("生活系统会在第 2 天解锁。", "warning");
    if (!isTradingPhase) return showToast("生活行动要在开始交易日之后才能安排。", "warning");
    const action = option.getResult(gameState.month);
    if (action.cashChange < 0 && gameState.cash < Math.abs(action.cashChange)) {
      return showToast("这项生活行动现在做不起，现金不够了。", "warning");
    }
    if (!tutorialLocked && dayCountdown <= action.timeCostSeconds) {
      return showToast("今日的时间不够了，先别再安排这个。", "warning");
    }
    const nextActions = [...selectedLifeActionsRef.current, action];
    setSelectedLifeActions(nextActions);
    selectedLifeActionsRef.current = nextActions;
    onTrackLifeAction?.(action);
    if (action.cashChange !== 0) onAdjustCash(action.cashChange);
    if (!tutorialLocked) {
      setDayCountdown((seconds) => Math.max(0, seconds - action.timeCostSeconds));
    }
    showToast(
      action.title + "，" + (action.cashChange === 0 ? "现金无变化" : (action.cashChange > 0 ? "+" : "-") + "¥" + formatMoney(Math.abs(action.cashChange))) + (tutorialLocked ? "，教学期不扣时间。" : "，耗时 " + action.timeCostSeconds + " 秒。"),
      action.cashChange >= 0 ? "success" : "info",
    );
  };

  const tutorialCard = useMemo<TutorialCard | null>(() => {
    if (!tutorialLocked) return null;

    if (gameState.month === 1) {
      if (isPrepPhase && modal === null && !dismissedTutorials["day1-welcome"]) {
        return {
          id: "day1-welcome",
          title: "第 1 步 · 看懂消息",
          text: "目标：学会从消息里找出“受影响的对象、方向、依据”。先打开「消息」，本局第一条模拟信息会影响沪深300。",
          target: "signals",
          actionLabel: "去看消息",
          onAction: () => openModal("signals"),
        };
      }
      if (modal === "signals" && !dismissedTutorials["day1-signals"]) {
        return {
          id: "day1-signals",
          title: "第 2 步 · 分辨信息",
          text: "阅读时分清三类内容：事实消息是发生了什么，观点是别人的判断，财报/行业线索是背景证据。王初一的建议只用于教学，不代表未来一定上涨。",
        };
      }
      if (isPrepPhase && modal === null && dismissedTutorials["day1-signals"] && !dismissedTutorials["day1-start"]) {
        return {
          id: "day1-start",
          title: "第 3 步 · 开始交易日",
          text: "消息看完后点击「开始交易日」。教学前两天不会倒计时，也不会自动结算；完成引导后，由你手动点击“结束今天”。",
          target: "startDay",
          actionLabel: "开始交易日",
          onAction: handleStartTradingDay,
        };
      }
      if (isTradingPhase && modal === null && !dismissedTutorials["day1-look-stats"]) {
        return {
          id: "day1-look-stats",
          title: "第 4 步 · 建立基础仓",
          text: "目标：把资金分配到与消息相关的 ETF。打开交易台，选择沪深300ETF，先建立约 2 万元的模拟基础仓。",
          target: "trade",
          actionLabel: "打开交易台",
          onAction: () => {
            setSelectedEtfId("csi300");
            setAmountText(String(Math.max(1000, Math.round(20000 / gameState.etfPrices.csi300))));
            setModal("trade");
          },
        };
      }
      if (modal === "trade" && boughtCashThisMonth < 20000 && !dismissedTutorials["day1-trade"]) {
        return {
          id: "day1-trade",
          title: "第 4 步 · 完成买入",
          text: "份额代表你持有的基金数量。买入金额约为“份额 × 当前模拟价格”，买入后现金减少、持仓增加，但此时还没有产生收益。",
          target: "buy20k",
        };
      }
      if (boughtCashThisMonth >= 20000 && modal === "trade" && !dismissedTutorials["day1-buy-ok"]) {
        return {
          id: "day1-buy-ok",
          title: "第 5 步 · 等待结算",
          text: "第一笔基础仓已完成。持仓不等于收益，真正结果要等收盘结算后，根据模拟价格变化计算。",
        };
      }
      if (boughtCashThisMonth >= 20000 && isTradingPhase && modal === null && !dismissedTutorials["day1-settle"]) {
        return {
          id: "day1-settle",
          title: "第 6 步 · 收盘复盘",
          text: "现在点「结束今天」。结算会统一更新价格，并计算当日收益、回撤、挑战结果和晚间复盘。",
          target: "settle",
        };
      }
    }

    if (gameState.month === 2) {
      if (isPrepPhase && modal === null && !dismissedTutorials["day2-start-reminder"]) {
        return {
          id: "day2-start-reminder",
          title: "第 2 天 · 看评分",
          text: "今天开始解锁走势和因子评分。评分是模拟分析工具，不是涨跌保证。先开始交易日，再用相同标准比较不同 ETF。",
          target: "startDay",
          actionLabel: "开始交易日",
          onAction: handleStartTradingDay,
        };
      }
      if (isTradingPhase && modal === null && !dismissedTutorials["day2-etf-entry"]) {
        return {
          id: "day2-etf-entry",
          title: "第 2 天 · 比较 ETF",
          text: "打开 ETF 图鉴。今天固定比较两只：AI ETF 偏进攻，上证50ETF 偏稳健。重点看风险、波动和评分，而不是只看一个收益数字。",
          target: "etfs",
          actionLabel: "打开 ETF 图鉴",
          onAction: () => {
            setSelectedEtfGuideDetail(null);
            setModal("etfs");
          },
        };
      }
      if (modal === "etfs" && selectedEtfGuideDetail === null && !dismissedTutorials["day2-etf-ai"]) {
        return {
          id: "day2-etf-ai",
          title: "第 2 天 · 进攻型资产",
          text: "先看 AI ETF。在本局模型中，它的成长弹性较高，但价格波动和回撤风险也更大。先确认你能否接受这种波动。",
          actionLabel: "先看 AI ETF",
          onAction: () => setSelectedEtfGuideDetail("ai"),
        };
      }
      if (
        modal === "etfs" &&
        selectedEtfGuideDetail === null &&
        dismissedTutorials["day2-etf-ai"] &&
        !dismissedTutorials["day2-etf-dividend"]
      ) {
        return {
          id: "day2-etf-dividend",
          title: "第 2 天 · 稳健型资产",
          text: "再看上证50ETF。它代表大盘核心资产风格，在本局模拟中通常波动较低，适合用来理解“底层配置”和组合分散。",
          actionLabel: "去看上证50ETF",
          onAction: () => setSelectedEtfGuideDetail("dividend"),
        };
      }
      if (modal === "etfs" && selectedEtfGuideDetail === "dividend" && !dismissedTutorials["day2-etf-wrap"]) {
        return {
          id: "day2-etf-wrap",
          title: "第 2 天 · 组合思维",
          text: "对比结论：进攻型资产追求更高弹性，稳健型资产负责降低组合波动。两者没有绝对好坏，关键是仓位是否匹配风险承受能力。",
        };
      }
      if (isTradingPhase && modal === null && dismissedTutorials["day2-etf-wrap"] && !dismissedTutorials["day2-trade-shift"]) {
        return {
          id: "day2-trade-shift",
          title: "第 2 天 · 完成调仓",
          text: "做一次模拟调仓：买一点上证50ETF，同时卖出部分沪深300ETF，观察组合结构的变化。调仓不是追涨杀跌，而是调整风险和收益的搭配。",
          target: "trade",
          actionLabel: "去交易台",
          onAction: () => {
            setSelectedEtfId("dividend");
            setAmountText("8000");
            setModal("trade");
          },
        };
      }
      if (modal === "trade" && !dismissedTutorials["day2-trade-note"]) {
        return {
          id: "day2-trade-note",
          title: "第 2 天 · 执行说明",
          text: "买入和卖出可分别操作。若难度支持策略单，止盈/止损会在收盘结算时检查，而不是日内实时触发。组合里可以同时保留进攻和防守部分。",
        };
      }
    }

    return null;
  }, [tutorialLocked, gameState.month, isPrepPhase, isTradingPhase, modal, tutorialFlags, hasBoughtThisMonth, dismissedTutorials, boughtCashThisMonth, gameState.etfPrices.csi300, gameState.etfPrices.dividend, selectedEtfGuideDetail]);

  const visibleTutorialCard =
    tutorialCard && (!dismissedTutorials[tutorialCard.id] || tutorialCard.target === "buy20k") ? tutorialCard : null;
  const tutorialTarget = visibleTutorialCard?.target;
  const isTutorialFocus = (target: NonNullable<TutorialCard["target"]>) => tutorialTarget === target;

  return (
    <main className="screen fit-screen">
      <section className="game-frame game-frame--play">
        <div className="town-topbar">
          <header className="town-brand">
            <PixelAvatar kind="cat" size="small" />
            <div className="town-brand__copy">
              <p className="eyebrow">Day {gameState.month} / {TOTAL_MONTHS}</p>
              <h1>ETF小镇 <span>投资挑战</span></h1>
              <div className="town-level">
                <span>小镇投资家</span>
                <small>Lv.{gameState.townProgress?.level ?? 1} {gameState.townProgress?.name ?? "交易所门口"}</small>
                <i aria-hidden="true">
                  <b style={{ width: `${Math.min(100, Math.max(6, (gameState.townProgress?.xp ?? 0) / 1.2))}%` }} />
                </i>
              </div>
            </div>
          </header>

          <section className="stats-grid compact-stats town-resource-bar">
            <StatCard className="stat-card--hero" label="现金" value={"¥" + formatMoney(gameState.cash)} />
            <StatCard className="stat-card--hero" label="总资产" value={"¥" + formatMoney(totalAsset)} />
            <StatCard className="stat-card--mini" label="收益" value={formatPercent(investmentReturn)} />
            <StatCard className="stat-card--mini" label="回撤" value={formatPercent(maxDrawdown)} />
            <StatCard className="stat-card--mini" label="持仓" value={formatPercent(getPositionRatio(gameState))} />
          </section>

          <div className="town-top-actions">
            <div className="hud-badges">
              <span className="mini-badge">{difficultyConfig.name}</span>
              {gameState.marketSeed !== undefined ? <span className="mini-badge mini-badge--seed">种子 {gameState.marketSeed}</span> : null}
            </div>
          </div>
        </div>

        <section className="town-layout">
          <aside className="town-sidebar">
            <div className="hub-button-grid">
              <button
                className={`hub-button hub-button--primary hub-button--trade ${isPrepPhase ? "hub-button--locked" : ""} ${isTutorialFocus("trade") ? "hub-button--tutorial" : ""}`}
                disabled={isPrepPhase || (!!tutorialTarget && tutorialTarget !== "trade")}
                onClick={() => setModal("trade")}
              >
                <strong>交易中心</strong>
                <span>{isPrepPhase ? "开局后解锁" : selectedEtf.name + " / " + gameState.holdings.length + " 只持仓"}</span>
              </button>
              <button
                className={`hub-button hub-button--signals ${isPrepPhase ? "hub-button--locked" : ""} ${isTutorialFocus("signals") ? "hub-button--tutorial" : ""}`}
                disabled={isPrepPhase || (!!tutorialTarget && tutorialTarget !== "signals")}
                onClick={() => openModal("signals")}
              >
                <strong>{isPrepPhase ? "市场消息" : "消息中心"}</strong>
                <span>{isPrepPhase ? "开局后解锁" : signalItems.length + " 条新闻 / " + monthTips.length + " 条观点"}</span>
              </button>
              <button
                className={`hub-button hub-button--life ${isTutorialFocus("life") ? "hub-button--tutorial" : ""}`}
                disabled={!showLifeActions || (!!tutorialTarget && tutorialTarget !== "life")}
                onClick={() => setModal("life")}
              >
                <strong>生活行动</strong>
                <span>{showLifeActions ? "安排今天的生活波动" : "第 2 天解锁"}</span>
              </button>
              <button
                className={`hub-button hub-button--etfs ${isTutorialFocus("etfs") ? "hub-button--tutorial" : ""}`}
                disabled={!!tutorialTarget && tutorialTarget !== "etfs"}
                onClick={() => setModal("etfs")}
              >
                <strong>ETF图鉴</strong>
                <span>{showTrend ? "查看走势和因子" : "第 2 天解锁走势"}</span>
              </button>
              <button className="hub-button hub-button--save" onClick={() => setSaveDialogMode("save")} type="button">
                <strong>存档</strong>
                <span>选择一个存档位</span>
              </button>
              <button className="hub-button hub-button--load" onClick={() => setSaveDialogMode("load")} type="button">
                <strong>读档</strong>
                <span>选择要读取的存档</span>
              </button>
              {gameState.month > 3 && isPrepPhase && !tutorialLocked ? (
                <button className="hub-button hub-button--report" onClick={() => {
                  if (window.confirm("确定要直接生成最终投资报告吗？")) {
                    onSkipToReport?.();
                  }
                }}>
                  <strong>成就</strong>
                  <span>查看当前模拟结果</span>
                </button>
              ) : null}
            </div>
          </aside>

          <section className="town-map">
            <section className={"market-clock-strip " + (tutorialLocked ? "is-untimed " : "") + (!tutorialLocked && revealedTodayNewsCount > 0 ? "is-alert " : "") + (!tutorialLocked && isFinalCountdown ? "is-danger " : "") + (marketLocked ? "is-locked" : "")}>
              <strong>{isPrepPhase ? "准备阶段" : tutorialLocked ? "教学阶段" : marketLocked ? "白天结束" : "白天倒计时"}</strong>
              <span>{isPrepPhase ? "未开盘" : countdownText}</span>
              <small>
                {isPrepPhase
                  ? "先看隔夜消息和持仓，再手动点击开始交易日。"
                  : tutorialLocked
                    ? "教学阶段不计时，也不会自动结算。"
                    : marketLocked
                      ? "正在进入晚间结算。"
                      : isFinalCountdown
                        ? "最后 10 秒。"
                        : droppedAllTodayNews
                          ? "今天没有新的新闻了。"
                          : "事件卡通常会在前 1 分半掉落。"}
              </small>
            </section>

            <div className="section-title center-title">
              <h2>{isPrepPhase ? "先做开盘前准备" : "今天做什么"}</h2>
              <p>
                {gameState.month === 1
                  ? "第 1 天先顺着利好建第一笔基础仓。"
                  : gameState.month === 2
                    ? "第 2 天开始学评分、走势和第一次调仓。"
                    : gameState.month === 3
                      ? "第 3 天开始，生活支出会更认真地影响你的节奏。"
                      : gameState.month === 4
                        ? "第 4 天提示会更短，更多判断要靠你自己。"
                        : "今天可以自由安排节奏。"}
              </p>
            </div>

            <div className="town-map-scene" aria-hidden="true">
              <span className="town-map-scene__building town-map-scene__building--trade" />
              <span className="town-map-scene__building town-map-scene__building--research" />
              <span className="town-map-scene__building town-map-scene__building--market" />
              <span className="town-map-scene__fountain" />
            </div>

            <div className="town-floating-labels" aria-hidden="true">
              <span className="town-map-label town-map-label--trade">交易中心</span>
              <span className="town-map-label town-map-label--research">投资研究</span>
              <span className="town-map-label town-map-label--build">小镇建设</span>
            </div>

                        <div className="town-notice">
              <strong>小镇公告</strong>
              <p>{gameState.month <= 4 ? (monthTips[0]?.content ?? overnightEvents[0]?.description ?? "今天消息面不算拥挤，留意仓位和节奏。") : (overnightEvents[0]?.description ?? "今天消息面不算拥挤，留意仓位和节奏。")}</p>
              {pendingCashRequirement ? <p>生活提醒：收盘前现金最好不少于 ¥{formatMoney(pendingCashRequirement)}。</p> : null}
            </div>
          </section>

          <aside className="town-task-panel"><PortfolioOverview gameState={gameState} etfs={etfs} />
            <div className="town-task-panel__header">
              <strong>今日任务</strong>
              <span>{dailyGoalProgress.completedCount}/{dailyGoalProgress.totalCount}</span>
            </div>
            {difficultyConfig.enableDailyGoals ? (
              <>
                <ul className="town-task-list">
                  {dailyGoalProgress.items.map((item: { done: boolean; label: string }, index: number) => (
                    <li key={`${item.label}-${index}`} className={item.done ? "is-done" : ""}>
                      <span>{item.label}</span>
                      <strong>{item.done ? "✔" : "·"}</strong>
                    </li>
                  ))}
                </ul>
                <div className="town-challenge-card">
                  <small>每日挑战</small>
                  <strong>{dailyChallenge.title}</strong>
                  <p>{dailyChallenge.description}</p>
                  <span>完成 +{dailyChallenge.rewardPoints} 徽章</span>
                </div>
                <div className="town-growth-card">
                  <small>小镇成长</small>
                  <strong>Lv.{gameState.townProgress.level}「{gameState.townProgress.name}」</strong>
                  <p>成长值 {gameState.townProgress.xp}</p>
                </div>
              </>
            ) : (
              <p className="town-task-empty">轻松模式保留节奏复盘，不强制每日任务。</p>
            )}
          </aside>
        </section>

        <footer className="town-bottom-bar">
          <div className="town-bottom-note">
            <strong>王初一提醒</strong>
            <p>先看消息和仓位，再决定今天要不要动手。比猜对错更重要的是说清楚理由。</p>
          </div>
          {isPrepPhase ? (
            <PixelButton
              className={`hub-settle-button ${isTutorialFocus("startDay") ? "hub-button--tutorial" : ""}`}
              disabled={!!tutorialTarget && tutorialTarget !== "startDay"}
              onClick={handleStartTradingDay}
            >
              开始交易日
            </PixelButton>
          ) : (
            <PixelButton
              className={`hub-settle-button ${isTutorialFocus("settle") ? "hub-button--tutorial" : ""}`}
              variant="danger"
              disabled={!!tutorialTarget && tutorialTarget !== "settle"}
              onClick={handleSettle}
            >
              结束今天
            </PixelButton>
          )}
        </footer>
        {visibleTutorialCard ? (
          <div className={`tutorial-backdrop ${visibleTutorialCard.target ? "tutorial-backdrop--nonblocking" : ""}`} onClick={() => {
            if (visibleTutorialCard.target === "buy20k") return;
            dismissTutorial(visibleTutorialCard.id);
          }}>
          <div
            className={`tutorial-guide-card ${
              visibleTutorialCard.target === "trade" || visibleTutorialCard.target === "buy20k"
                ? "tutorial-guide-card--trade"
                : "tutorial-guide-card--center"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tutorial-guide-card__top">
              <p className="eyebrow">{visibleTutorialCard.title}</p>
              {visibleTutorialCard.target !== "buy20k" ? (
                <PixelButton
                  className="tutorial-guide-card__close"
                  variant="secondary"
                  onClick={() => dismissTutorial(visibleTutorialCard.id)}
                  type="button"
                >
                  关闭引导
                </PixelButton>
              ) : (
                <span className="tutorial-guide-card__pin">先完成这一步</span>
              )}
            </div>
            <p>{visibleTutorialCard.text}</p>
            {visibleTutorialCard.actionLabel && visibleTutorialCard.onAction ? (
              <button
                className="pixel-button hub-button--tutorial"
                type="button"
                onClick={() => {
                  visibleTutorialCard.onAction?.();
                  dismissTutorial(visibleTutorialCard.id);
                }}
              >
                {visibleTutorialCard.actionLabel}
              </button>
            ) : null}
          </div>
          </div>
        ) : null}

        {lifeEventPopup ? (
          <div className="life-event-popup" onClick={() => setLifeEventPopup(null)} role="button" tabIndex={0}>
            <div className={`life-event-popup__card life-event-popup__card--${lifeEventPopup.mood}`} onClick={(event) => event.stopPropagation()}>
              <div className="life-event-popup__top">
                <p className="eyebrow">生活突发事件</p>
                <button className="life-event-popup__close" onClick={() => setLifeEventPopup(null)} type="button">
                  关闭
                </button>
              </div>
              <strong>{lifeEventPopup.title}</strong>
              <p>{lifeEventPopup.description}</p>
              <div className="life-event-popup__chips">
                <span>{getLifeEventProbabilityNote(gameState.month, lifeEventPopup.id)}</span>
                <span className={lifeEventPopup.cashChange >= 0 ? "up-text" : "down-text"}>
                  {lifeEventPopup.cashChange >= 0 ? "+" : "-"}¥{formatMoney(Math.abs(lifeEventPopup.cashChange))}
                </span>
                {lifeEventPopup.timeCostSeconds ? <span>{tutorialLocked ? "教学期不扣时间" : `耗时 ${lifeEventPopup.timeCostSeconds} 秒`}</span> : null}
                {lifeEventPopup.nextDayCashRequired ? <span>明天建议留现金 ¥{formatMoney(lifeEventPopup.nextDayCashRequired)}</span> : null}
              </div>
            </div>
          </div>
        ) : null}

        {toast ? <ToastBanner text={toast.text} tone={toast.tone} onDismiss={dismissToast} /> : null}

        {saveDialogMode ? (
          <ModalFrame
            title={saveDialogMode === "save" ? "选择存档位" : "选择读档"}
            eyebrow="存档管理"
            onClose={() => setSaveDialogMode(null)}
          >
            <div className="save-slot-dialog">
              <p className="save-slot-dialog__hint">
                {saveDialogMode === "save"
                  ? "请选择一个位置保存当前进度。进阶模式的独立种子会固定保存在「进阶种子档」。"
                  : "请选择要继续的存档。空档位不会显示读取按钮。"}
              </p>
              <div className="save-slot-grid">
                {saveSlots.map((slot) => {
                  const isCurrent = activeSaveSlot === slot.id;
                  const canRead = slot.exists;
                  return (
                    <article className={`save-slot-card ${isCurrent ? "is-current" : ""}`} key={slot.id}>
                      <div className="save-slot-card__head">
                        <strong>{slot.label}</strong>
                        <span>{isCurrent ? "当前" : slot.exists ? "已有进度" : "空档位"}</span>
                      </div>
                      <p>
                        {slot.exists
                          ? `Day ${slot.month ?? 1} / 12 · ${slot.difficulty ? getDifficultyConfig(slot.difficulty).name : "未知难度"}`
                          : "还没有保存过游戏"}
                      </p>
                      {slot.marketSeed !== undefined ? <small>种子：{slot.marketSeed}</small> : null}
                      {slot.updatedAt ? <small>保存时间：{formatSaveTime(slot.updatedAt)}</small> : null}
                      <PixelButton
                        disabled={saveDialogMode === "load" && !canRead}
                        onClick={() => {
                          if (saveDialogMode === "save") {
                            onSaveToSlot(slot.id);
                          } else {
                            onLoadSlot(slot.id);
                          }
                          setSaveDialogMode(null);
                        }}
                        type="button"
                        variant={saveDialogMode === "load" && !canRead ? "secondary" : "primary"}
                      >
                        {saveDialogMode === "save" ? "保存到这里" : canRead ? "读取此档" : "暂无进度"}
                      </PixelButton>
                    </article>
                  );
                })}
              </div>
            </div>
          </ModalFrame>
        ) : null}

        {modal === "trade" ? (
          <ModalFrame title="交易台" eyebrow="交易窗口" onClose={() => setModal(null)}>
            <div className="trade-terminal">
              <div className="trade-terminal__panel">
                <div className="trade-controls compact-trade">
                  <label>
                    ETF
                    <select
                      disabled={!isTradingPhase || marketLocked}
                      value={selectedEtfId}
                      onChange={(event) => setSelectedEtfId(event.target.value as EtfId)}
                    >
                      {etfs.map((etf) => (
                        <option key={etf.id} value={etf.id}>
                          {etf.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    买卖份额
                    <input
                      disabled={!isTradingPhase || marketLocked || (tutorialTarget === "buy20k" && boughtCashThisMonth >= 20000)}
                      min="0"
                      step="10"
                      type="number"
                      value={amountText}
                      onChange={(event) => setAmountText(event.target.value)}
                    />
                  </label>
                  <div className="amount-stepper">
                    <button disabled={!isTradingPhase || marketLocked || (!!tutorialTarget && tutorialTarget !== "buy20k")} onClick={() => adjustTradeAmount(-100)} type="button">-100</button>
                    <button disabled={!isTradingPhase || marketLocked || (!!tutorialTarget && tutorialTarget !== "buy20k")} onClick={() => adjustTradeAmount(100)} type="button">+100</button>
                  </div>
                  <div className="trade-buttons compact-buttons">
                    <PixelButton
                      className={isTutorialFocus("buy20k") ? "hub-button--tutorial" : ""}
                      disabled={!isTradingPhase || marketLocked || (!!tutorialTarget && tutorialTarget !== "buy20k")}
                      onClick={handleBuy}
                    >
                      买入
                    </PixelButton>
                    <PixelButton disabled={!isTradingPhase || marketLocked || !!tutorialTarget} variant="secondary" onClick={handleSell}>卖出</PixelButton>
                  </div>
                </div>
                {difficultyConfig.enableStrategyOrders ? (
                  <div className="trade-buttons compact-buttons">
                    <PixelButton disabled={!isTradingPhase || marketLocked} onClick={() => onSetStrategyOrder?.(selectedEtfId, "takeProfit", 0.08)} variant={selectedStrategyOrder?.type === "takeProfit" ? "primary" : "secondary"}>止盈 +8%</PixelButton>
                    <PixelButton disabled={!isTradingPhase || marketLocked} onClick={() => onSetStrategyOrder?.(selectedEtfId, "stopLoss", -0.06)} variant={selectedStrategyOrder?.type === "stopLoss" ? "primary" : "secondary"}>止损 -6%</PixelButton>
                    {selectedStrategyOrder ? <PixelButton disabled={!isTradingPhase || marketLocked} onClick={() => onClearStrategyOrder?.(selectedEtfId)} variant="danger">取消策略</PixelButton> : null}
                  </div>
                ) : null}

                <div className="trade-hint compact-hint">
                  <span>持仓市值 ¥{formatMoney(selectedHoldingValue)}</span>
                  <span>今日可卖 ¥{formatMoney(sellableHoldingValue)}</span>
                  {selectedStrategyOrder ? <span>{selectedStrategyOrder.type === "takeProfit" ? "止盈" : "止损"} {formatPercent(selectedStrategyOrder.threshold)}</span> : null}
                  {remainingMonthlyLimit !== undefined ? <span>纳指额度 ¥{formatMoney(remainingMonthlyLimit)}</span> : null}
                </div>

                <div className="guide-box trade-guide">
                  <PixelAvatar kind="cat" size="small" />
                  <div>
                    <strong>王初一点评</strong>
                    <p>{buildGuideLine(selectedEtf, selectedScore, gameState, rawMarketEvents, factorScores)}</p>
                  </div>
                </div>
              </div>

              <div className="trade-terminal__panel trade-terminal__panel--holdings">
                <div className="trade-terminal__header">
                  <strong>当前持仓</strong>
                  <span>{gameState.holdings.length} 只 ETF</span>
                </div>
                <HoldingList gameState={gameState} onSelectEtf={(etfId) => { setSelectedEtfId(etfId); setModal("trade"); }} />
              </div>
            </div>
          </ModalFrame>
        ) : null}

        {modal === "life" ? (
          <ModalFrame title="生活行动" eyebrow="生活窗口" onClose={() => setModal(null)}>
            <LifeActionPanel
              activeLifeEvent={gameState.activeLifeEvent}
              dayCountdown={dayCountdown}
              tutorialLocked={tutorialLocked}
              selectedLifeActions={selectedLifeActions}
            />
            <div className="skill-options life-action-grid">
              {lifeActions.map((action) => (
                <button key={action.id} className="life-action-card" onClick={() => chooseLifeAction(action)}>
                  <div className="life-action-card__top">
                    <strong>{action.title}</strong>
                    <span>{getLifeActionTag(action.id)}</span>
                  </div>
                  <span>{action.teaser}</span>
                </button>
              ))}
            </div>
          </ModalFrame>
        ) : null}

        {modal && ["signals", "etfs"].includes(modal) ? (
          <InfoModalWindow
            briefs={displayMonthBriefs}
            etfs={etfs}
            factorScores={factorScores}
            gameState={gameState}
            onClose={() => setModal(null)}
            onBackEtfList={() => setSelectedEtfGuideDetail(null)}
            onSelectEtfDetail={setSelectedEtfGuideDetail}
            selectedEtfDetail={modal === "etfs" ? selectedEtfGuideDetail : null}
            showTrend={showTrend}
            signals={displaySignalItems}
            tips={displayMonthTips}
            activeLifeEvent={gameState.activeLifeEvent}
            type={modal as Exclude<ModalType, "trade" | "life" | null>}
          />
        ) : null}
      </section>
    </main>
  );
}

function formatSaveTime(timestamp: number) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function seededUiRandom(seed: number) {
  const x = Math.sin(seed * 89.91 + 23.4) * 10000;
  return x - Math.floor(x);
}

function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return minutes + ":" + rest.toString().padStart(2, "0");
}

function getLifeEventProbabilityNote(day: number, eventId: string) {
  if (eventId === "rent" && day === 3) {
    return "第 3 天固定触发";
  }
  if (eventId.startsWith("black-")) {
    return "第 9 天后额外小概率黑天鹅";
  }
  if (day >= 4) {
    return "按设定约 50% 概率出现";
  }
  return "按当天生活波动规则触发";
}





