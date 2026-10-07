import type {
  GameState,
  InvestorMetricKey,
  InvestorMetrics,
  InvestorProfile,
  LifeActionResult,
} from "../types/game";

export const metricLabels: Record<InvestorMetricKey, string> = {
  fomo: "FOMO等级",
  contrarian: "逆向思维",
  riskTolerance: "风险承受",
  emotionalStability: "情绪稳定",
  decisionSpeed: "决策速度",
  informationDependence: "信息依赖",
  discipline: "纪律性",
  cashSecurity: "现金安全感",
};

export interface PersonalityInfo {
  core: { name: string; emoji: string; description: string };
  easterEgg: { name: string; emoji: string; description: string } | null;
  suffix: { name: string; description: string };
  fullTitle: string;
}

type CoreProfile = {
  name: string;
  emoji: string;
  description: string;
  score: (metrics: InvestorMetrics) => number;
};

const CORES: CoreProfile[] = [
  {
    name: "追风少年",
    emoji: "🏄",
    description: "热点一热你就会更快出手。你不是没有判断，而是很难对正在上涨的东西完全无动于衷。",
    score: (m) => m.fomo * 1.15 + m.decisionSpeed * 0.25 - m.discipline * 0.18 - m.cashSecurity * 0.08,
  },
  {
    name: "逆行者",
    emoji: "🔄",
    description: "你会下意识避开拥挤方向，越是满屏一致看多，你越想先退半步再观察。",
    score: (m) => m.contrarian * 1.15 + m.emotionalStability * 0.12 - m.informationDependence * 0.1,
  },
  {
    name: "冷面赌徒",
    emoji: "🎯",
    description: "你对波动的耐受度偏高，涨跌都不太容易把你从计划里拽出去。",
    score: (m) => m.riskTolerance * 0.95 + m.emotionalStability * 0.45 - m.cashSecurity * 0.18,
  },
  {
    name: "现金为王",
    emoji: "🏦",
    description: "你对安全垫有执念，更愿意慢一点，也不想让账户为了多赚一点而睡不安稳。",
    score: (m) => m.cashSecurity * 1.05 + (100 - m.riskTolerance) * 0.22 + (100 - m.fomo) * 0.08,
  },
  {
    name: "闪电手",
    emoji: "⚡",
    description: "你下单很快，直觉经常比研究更早一步。抢窗口是你的本能。",
    score: (m) => m.decisionSpeed * 1.12 + m.fomo * 0.15 - m.discipline * 0.08,
  },
  {
    name: "消息迷",
    emoji: "📡",
    description: "没有足够的消息支撑，你很难安心出手。你更信信息链，而不是一时的感觉。",
    score: (m) => m.informationDependence * 1.1 + m.fomo * 0.1 - m.contrarian * 0.1,
  },
  {
    name: "纪律委员",
    emoji: "📋",
    description: "你会努力把交易收回到计划里。消息再多，也不会轻易完全带跑你的节奏。",
    score: (m) => m.discipline * 1.12 + m.emotionalStability * 0.18 - m.fomo * 0.1,
  },
  {
    name: "佛系玩家",
    emoji: "🧘",
    description: "你没有特别极端的一侧，更像是在一边摸索、一边形成自己的节奏。",
    score: (m) => {
      const values = Object.values(m);
      const balancePenalty = values.reduce((sum, value) => sum + Math.abs(value - 50), 0) / values.length;
      return 100 - balancePenalty * 1.5;
    },
  },
  {
    name: "惊弓之鸟",
    emoji: "🐦",
    description: "你对回撤比较敏感，账户一抖就容易先担心风险而不是先想机会。",
    score: (m) => (100 - m.emotionalStability) * 1.15 + m.cashSecurity * 0.22,
  },
  {
    name: "独行侠",
    emoji: "🐺",
    description: "你不太爱跟着外界判断走，更信自己那套标准。慢一点没关系，但一定要自己认可。",
    score: (m) => m.contrarian * 0.95 + (100 - m.informationDependence) * 0.55 + m.discipline * 0.08,
  },
];

const EASTERS = [
  {
    id: "piggy",
    name: "猪猪男孩",
    emoji: "🐷",
    check: (history: LifeActionResult[]) => history.filter((action) => action.id === "dinnerTalk").length >= 2,
    description: "不是在请人吃饭，就是在去吃饭的路上。你的社交节奏有时候比交易节奏还热闹。",
  },
  {
    id: "worker",
    name: "打工皇帝",
    emoji: "💼",
    check: (history: LifeActionResult[]) => history.filter((action) => action.id === "focusWork").length >= 2,
    description: "交易是一面，打工才是主线。你很清楚工资现金流也是底气的一部分。",
  },
  {
    id: "spy",
    name: "情报局长",
    emoji: "🕵️",
    check: (history: LifeActionResult[]) => history.filter((action) => action.id === "listenNews").length >= 2,
    description: "你花在打听消息上的时间，已经足够再看一遍盘。情报是你的第二天赋。",
  },
  {
    id: "nerd",
    name: "学术大牛",
    emoji: "🎓",
    check: (history: LifeActionResult[]) => history.filter((action) => action.id === "deepResearch").length >= 2,
    description: "你会认真把资料翻到底。比起一条消息，你更想知道它背后的逻辑到底站不站得住。",
  },
  {
    id: "lotto",
    name: "彩票专业户",
    emoji: "🎰",
    check: (history: LifeActionResult[]) => history.filter((action) => action.id === "lottery").length >= 2,
    description: "你心里一直给奇迹留着一个座位。ETF 是正经投资，但偶尔也想和概率讲讲感情。",
  },
  {
    id: "moon",
    name: "月光族",
    emoji: "🌙",
    check: (history: LifeActionResult[]) =>
      history.filter((action) => action.cashChange < 0).reduce((sum, action) => sum - action.cashChange, 0) > 4000,
    description: "钱经常流向生活，而不是一直留在账户里。你很像一边生活一边投资的人。",
  },
  {
    id: "tight",
    name: "铁公鸡",
    emoji: "🐔",
    check: (history: LifeActionResult[]) =>
      history.filter((action) => action.cashChange < 0).reduce((sum, action) => sum - action.cashChange, 0) < 300,
    description: "你对每一笔花销都很有感觉。ETF 之外的钱，能省一点是一点。",
  },
  {
    id: "giver",
    name: "散财童子",
    emoji: "🎁",
    check: (history: LifeActionResult[]) =>
      history.filter((action) => action.cashChange < 0).reduce((sum, action) => sum - action.cashChange, 0) > 5000,
    description: "你对生活和情绪都很舍得花钱。账户不一定最肥，但小镇消费活力确实被你拉高了。",
  },
];

const SUFFIXES = [
  {
    name: "见好就收",
    check: (gameState: GameState) => gameState.month <= 6 && (gameState.lastMonthResult?.monthlyProfit ?? 0) > 0,
    description: "你知道什么时候够了，愿意把利润先装进口袋。",
  },
  {
    name: "及时止损",
    check: (gameState: GameState) => gameState.month <= 6 && (gameState.lastMonthResult?.monthlyProfit ?? 0) <= 0,
    description: "方向不对就先退，你更在意活着看到下一局。",
  },
  {
    name: "复利信徒",
    check: (gameState: GameState) => gameState.month >= 10 && (gameState.lastMonthResult?.monthlyProfit ?? 0) > 0,
    description: "你愿意给时间留下足够的工作空间，慢慢把优势滚出来。",
  },
  {
    name: "长期主义",
    check: (gameState: GameState) => gameState.month >= 10 && (gameState.lastMonthResult?.monthlyProfit ?? 0) <= 0,
    description: "即使过程不完美，你也愿意把眼光放得更长一些。",
  },
  {
    name: "心跳玩家",
    check: (gameState: GameState) => getMdd(gameState.assetHistory) > 0.15,
    description: "你的曲线不平，情绪也大概率不平，但你确实敢扛。",
  },
  {
    name: "稳步前行",
    check: (gameState: GameState) => getMdd(gameState.assetHistory) < 0.05,
    description: "不追求一路高歌猛进，更在意整局走下来是不是舒服。",
  },
  {
    name: "手续费贡献者",
    check: (gameState: GameState) => gameState.tradeRecords.length >= 20,
    description: "你的手非常勤，平台运营看到你都会露出欣慰的微笑。",
  },
  {
    name: "观察者",
    check: (gameState: GameState) => gameState.tradeRecords.length <= 2,
    description: "你更像是先看懂局势，再慢慢形成自己的方式。",
  },
];

const metricKeys: InvestorMetricKey[] = [
  "fomo",
  "contrarian",
  "riskTolerance",
  "emotionalStability",
  "decisionSpeed",
  "informationDependence",
  "discipline",
  "cashSecurity",
];

const lifeLines = [
  "想把账户慢慢养稳",
  "总想比市场再冷静一点",
  "看到热点时很难完全无动于衷",
  "相信工资和纪律能慢慢换来自由",
  "更在意少亏一点，再谈多赚一点",
  "相信长期配置，但偶尔也会被消息带偏",
];

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getMdd(history: { totalAsset: number }[]) {
  let peak = 0;
  let maxDrawdown = 0;

  history.forEach((point) => {
    peak = Math.max(peak, point.totalAsset);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, (peak - point.totalAsset) / peak);
    }
  });

  return maxDrawdown;
}

export function createInvestorProfile(seed = Date.now()): InvestorProfile {
  const lifeLine = lifeLines[seed % lifeLines.length];
  const metrics = metricKeys.reduce((result, key, index) => {
    const wave = Math.sin(seed * (index + 3)) * 12;
    result[key] = clampMetric(50 + wave);
    return result;
  }, {} as InvestorMetrics);

  if (lifeLine.includes("热点")) {
    metrics.fomo += 10;
    metrics.decisionSpeed += 7;
    metrics.discipline -= 6;
  }
  if (lifeLine.includes("少亏")) {
    metrics.cashSecurity += 8;
    metrics.riskTolerance -= 4;
  }
  if (lifeLine.includes("冷静")) {
    metrics.emotionalStability += 8;
    metrics.contrarian += 8;
  }

  metricKeys.forEach((key) => {
    metrics[key] = clampMetric(metrics[key]);
  });

  return {
    name: "小镇投资者 " + String((seed % 900) + 100),
    lifeLine,
    metrics,
  };
}

export function applyMetricChanges(
  metrics: InvestorMetrics,
  changes: Array<{ key: InvestorMetricKey; delta: number }>,
): InvestorMetrics {
  const weights: Record<InvestorMetricKey, number> = {
    fomo: 2.2,
    contrarian: 2,
    riskTolerance: 1.8,
    emotionalStability: 2,
    decisionSpeed: 1.8,
    informationDependence: 1.8,
    discipline: 2,
    cashSecurity: 1.5,
  };

  const next = { ...metrics };

  changes.forEach((change) => {
    next[change.key] = clampMetric(next[change.key] + change.delta * weights[change.key]);
  });

  return next;
}

export function getPersonalityInfo(gameState: GameState): PersonalityInfo {
  const metrics = gameState.investorProfile?.metrics;
  const history = gameState.lifeActionHistory ?? [];

  const rankedCores = metrics
    ? CORES.map((profile) => ({ profile, score: profile.score(metrics) })).sort((left, right) => right.score - left.score)
    : [{ profile: CORES[7], score: 0 }];

  const core = rankedCores[0]?.profile ?? CORES[7];
  const egg = EASTERS.find((item) => item.check(history)) ?? null;
  const suffix =
    SUFFIXES.find((item) => item.check(gameState)) ?? {
      name: "体验玩家",
      description: "你把整局走完了，本身就已经攒下了下一局会用到的直觉。",
    };

  const parts = [`${core.emoji} ${core.name}`];
  if (egg) {
    parts.push(`${egg.emoji} ${egg.name}`);
  }
  parts.push(`· ${suffix.name}`);

  return {
    core: { name: core.name, emoji: core.emoji, description: core.description },
    easterEgg: egg ? { name: egg.name, emoji: egg.emoji, description: egg.description } : null,
    suffix: { name: suffix.name, description: suffix.description },
    fullTitle: parts.join(" "),
  };
}
