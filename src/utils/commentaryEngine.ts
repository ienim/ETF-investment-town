import { etfs as etfCatalog } from "../data/etfs";
import type {
  Etf,
  ExpertTip,
  GameState,
  LifeActionResult,
  MarketEvent,
  LifeEvent,
  MonthlyReturn,
  NightIntel,
} from "../types/game";
import type { FactorScore } from "./factorEngine";
import { getPositionRatio } from "./portfolio";

type TipTone = "solid" | "mixed" | "wild";

export interface GeneratedTip {
  id: string;
  speaker: string;
  content: string;
  tone: TipTone;
}

function findEtfName(etfId: string) {
  return etfCatalog.find((item) => item.id === etfId)?.name ?? etfId;
}

function sortReturns(returns: MonthlyReturn[]) {
  return [...returns].sort((a, b) => b.returnRate - a.returnRate);
}

function getStrongestFactor(score: FactorScore) {
  const entries = [
    { key: "macro", label: "宏观", value: score.macro },
    { key: "technical", label: "技术", value: score.technical },
    { key: "fundFlow", label: "资金", value: score.fundFlow },
    { key: "sentiment", label: "情绪", value: score.sentiment },
  ];

  return entries.sort((a, b) => b.value - a.value)[0];
}

function pickVariant<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

export function buildGuideLine(
  etf: Etf,
  score?: FactorScore,
  gameState?: GameState,
  dailyEvents?: MarketEvent[],
  allFactorScores?: FactorScore[],
) {
  const position = gameState ? getPositionRatio(gameState) : 0;
  const strongest = score ? getStrongestFactor(score) : undefined;
  const relevantEvents = (dailyEvents ?? []).filter(
    (e) => e.targetEtfs.includes(etf.id) || e.effects?.[etf.id] !== undefined,
  );
  const hasPositiveEvent = relevantEvents.some((e) => {
    const effect = e.effects?.[etf.id] ?? (e.targetEtfs.includes(etf.id) ? e.effect : 0);
    return effect > 0;
  });
  const hasNegativeEvent = relevantEvents.some((e) => {
    const effect = e.effects?.[etf.id] ?? (e.targetEtfs.includes(etf.id) ? e.effect : 0);
    return effect < 0;
  });

  if (relevantEvents.length > 0) {
    const eventTitles = relevantEvents.slice(0, 2).map((e) => e.title);
    const eventContext = eventTitles.join("、");

    if (hasPositiveEvent && !hasNegativeEvent) {
      if (etf.highVolatility) {
        return etf.name + "今天有利好事件——「" + eventContext + "」。不过它波动大，就算消息面偏暖，也要控制好仓位节奏。";
      }
      return etf.name + "今天有利好消息——「" + eventContext + "」。情绪上偏积极，但别只看消息买基金，关键还是看它在你组合里的位置。";
    }

    if (hasNegativeEvent && !hasPositiveEvent) {
      if (etf.highVolatility) {
        return etf.name + "今天有一些偏空的消息——「" + eventContext + "」。高波动品种遇到利空容易放大跌幅，先看看再决定要不要动。";
      }
      return etf.name + "今天有一些偏空的消息——「" + eventContext + "」。不过消息面只是短期扰动，关键是它的长期逻辑有没有变。";
    }

    return etf.name + "今天消息面交织——「" + eventContext + "」。有好有坏的时候，最好的策略通常是多看少动。";
  }

  if (etf.id === "dividend") {
    return "红利ETF偏防御，适合作为组合里的现金流底仓，节奏通常慢，但容错更高。";
  }

  if (etf.id === "nasdaq") {
    return "纳斯达克ETF更适合分批看待，趋势感常常不错，但回撤来时也不会先打招呼。";
  }

  if (etf.highVolatility) {
    if (position >= 0.75) {
      return `${etf.name}本身波动就高，你现在仓位已经不轻了，真想加也更适合小步试，不适合情绪一热就猛追。`;
    }

    return `${etf.name}属于高波动主题，更像卫星仓位。先想清楚是做趋势跟随，还是只想摸一下热度。`;
  }

  if (strongest?.label === "资金") {
    return `${etf.name}这会儿更像资金偏好的受益者，适合放进组合里观察节奏，不一定要一下子压很重。`;
  }

  if (strongest?.label === "宏观") {
    return `${etf.name}更吃大环境和配置逻辑，适合作为组合的一部分，关键还是比例和耐心。`;
  }

  return `${etf.name}适合作为组合的一部分，先看它在你整体仓位里扮演什么角色，再决定要不要继续加。`;
}

export function buildGeneratedTips(
  month: number,
  factorScores: FactorScore[],
  events: Array<{ id: string; title: string; targetEtfs: string[]; truthiness: string; eventType?: string }>,
  baseTips: ExpertTip[],
  gameState: GameState,
): GeneratedTip[] {
  const sortedScores = [...factorScores].sort((a, b) => b.probability - a.probability);
  const strongest = sortedScores[0];
  const weakest = sortedScores.at(-1);
  const secondStrongest = sortedScores[1] ?? strongest;
  const hottestEvent = events.find((event) => event.eventType === "blackSwan" || event.eventType === "important") ?? events[0];
  const position = getPositionRatio(gameState);
  const dayTag = month <= 2 ? "新手期" : month >= 10 ? "收官期" : "中段";
  const tips: GeneratedTip[] = [];

  if (hottestEvent && strongest) {
    const catOptions = [
      `${dayTag}先看逻辑再看热闹。${hottestEvent.title}把${findEtfName(strongest.etfId)}推热了，不过机会和拥挤常常一起出现。`,
      `${dayTag}的主角像是${findEtfName(strongest.etfId)}。${hottestEvent.title}会把目光都拽过去，但真正决定你舒服不舒服的还是仓位。`,
      `${hottestEvent.title}现在最能带情绪，${findEtfName(strongest.etfId)}自然最显眼。王初一提醒你，显眼不等于适合一口气追满。`,
    ];

    tips.push({
      id: `cat-${month}`,
      speaker: "王初一",
      tone: "solid",
      content: position >= 0.72 ? `${dayTag}别太急着追。${catOptions[1]}` : pickVariant(catOptions, month),
    });
  }

  if (strongest && weakest) {
    const bloggerOptions = [
      `今天聊得最多的是${findEtfName(strongest.etfId)}，而争议最大的反而是${findEtfName(weakest.etfId)}。热度能带来弹性，也会带来反手。`,
      `评论区已经开始把${findEtfName(strongest.etfId)}吹成主线了，但${findEtfName(weakest.etfId)}这种弱势方向，往往才最容易突然补跌。`,
      `${findEtfName(strongest.etfId)}被越聊越像答案，可市场最爱考的恰恰是“你是不是把最吵的声音当成了结论”。`,
    ];

    tips.push({
      id: `blogger-${month}`,
      speaker: "博主阿浪",
      tone: strongest.probability >= 68 ? "mixed" : "wild",
      content: pickVariant(bloggerOptions, month + strongest.probability),
    });
  }

  if (strongest) {
    const strongestFactor = getStrongestFactor(strongest);
    const factorOptions = [
      `${findEtfName(strongest.etfId)}当前最强的支点在${strongestFactor.label}面，说明它不只是情绪热，背后还有别的力量在推。`,
      `如果只看综合强弱，${findEtfName(strongest.etfId)}现在站得最稳，尤其是${strongestFactor.label}这条线还算顺。`,
      `今天更像${findEtfName(strongest.etfId)}的节奏日，${strongestFactor.label}评分给了它一层额外保护。`,
    ];

    tips.push({
      id: `factor-${month}`,
      speaker: "王初一",
      tone: "solid",
      content: pickVariant(factorOptions, month * 2),
    });
  }

  if (secondStrongest && hottestEvent) {
    const eventOptions = [
      `就事实层面看，${hottestEvent.title}最可能先带动${findEtfName(secondStrongest.etfId)}这类方向，后面才轮到别的题材接棒。`,
      `今天这条消息真正值得记的是路径，不是口号。${hottestEvent.title}如果继续发酵，${findEtfName(secondStrongest.etfId)}也会被顺手带热。`,
      `把标题拆开看，${hottestEvent.title}对${findEtfName(secondStrongest.etfId)}的影响会更直接一点，不一定非得盯着最吵的那只。`,
    ];

    tips.push({
      id: `event-fact-${month}`,
      speaker: "盘前手账",
      tone: "mixed",
      content: pickVariant(eventOptions, month * 3),
    });
  }

  if (weakest) {
    const weakestName = findEtfName(weakest.etfId);
    const riskOptions =
      position >= 0.7
        ? [
            `${weakestName}现在最像拖后腿的那只，仓位已经不轻时，少犯一次“越跌越想证明自己”的错也很重要。`,
            `${weakestName}这一侧的承接偏弱，满仓心态下最容易把小回撤放大成硬扛。`,
            `${weakestName}如果继续弱，真正难受的不是跌幅本身，而是它会把你整体仓位的容错拉低。`,
          ]
        : [
            `${weakestName}这边暂时别急着脑补反转，弱势方向最常见的不是立刻回暖，而是先把耐心磨掉。`,
            `${weakestName}当前偏弱，真要观察也更像小仓位跟踪，而不是先替它想象一整套翻身剧本。`,
            `${weakestName}现在更适合放进观察名单，而不是直接放进情绪名单。`,
          ];

    tips.push({
      id: `risk-${month}`,
      speaker: "风控便利贴",
      tone: "mixed",
      content: pickVariant(riskOptions, month * 5),
    });
  }

  baseTips.slice(0, 2).forEach((tip, index) => {
    tips.push({
      id: `${tip.id}-${index}`,
      speaker: tip.speaker,
      tone: tip.confidence >= 0.66 ? "solid" : tip.confidence >= 0.5 ? "mixed" : "wild",
      content: tip.content,
    });
  });

  return tips.slice(0, 5);
}

export function createMonthlyFeedback(input: {
  profit: number;
  investmentReturnRate: number;
  monthlyReturns: MonthlyReturn[];
  lifeEvent?: LifeEvent;
}) {
  const sorted = sortReturns(input.monthlyReturns);
  const leader = sorted[0];
  const lagger = sorted.at(-1);
  const leaderName = leader ? findEtfName(leader.etfId) : "强势ETF";
  const laggerName = lagger ? findEtfName(lagger.etfId) : "弱势ETF";

  if (input.lifeEvent?.cashChange && input.lifeEvent.cashChange < 0 && input.profit < 0) {
    return pickVariant(
      [
        `王初一说：今天是市场和生活一起上压力的那种日子。${laggerName}拖了后腿，现金垫也被现实摸了一下。`,
        `王初一说：盘面没站稳，生活支出还来补了一脚。${laggerName}偏弱时，这种双重压力会特别明显。`,
        `王初一说：今天不只是亏损难受，更难受的是现实和盘面一起挤你。${laggerName}正好在最不争气的位置。`,
      ],
      Math.round(Math.abs(input.profit)),
    );
  }

  if (input.profit > 0 && input.investmentReturnRate >= 0.04) {
    return pickVariant(
      [
        `王初一说：今天这笔判断挺漂亮，${leaderName}给了你明显顺风，操作节奏也没乱。`,
        `王初一说：今天是那种让人想把截图留起来的收盘，${leaderName}把账户往上稳稳托了一截。`,
        `王初一说：这次你不只是赚到了，还赚得挺像样。${leaderName}冲在前面，仓位配合也不乱。`,
      ],
      Math.round(input.investmentReturnRate * 1000),
    );
  }

  if (input.profit > 0) {
    return pickVariant(
      [
        `王初一说：账户今天抬头了，带队的是${leaderName}。先记逻辑，别只记住自己刚好赚到了。`,
        `王初一说：今天的收盘是舒服的，${leaderName}帮你把气氛往上推了一点。`,
        `王初一说：今天是小赚，但这类小赚最适合拿来确认自己的节奏有没有跑偏。`,
      ],
      Math.round(input.profit),
    );
  }

  if (input.profit < 0 && input.investmentReturnRate <= -0.04) {
    return pickVariant(
      [
        `王初一说：今天跌得有点疼，${laggerName}是主要拖累。先看仓位，再看消息，别让复盘变成情绪二连击。`,
        `王初一说：这不是轻轻晃一下，是有点实打实的回撤。${laggerName}把组合拽得最狠。`,
        `王初一说：今天该做的不是急着找下一条消息，而是承认${laggerName}真的让你难受了。`,
      ],
      Math.round(Math.abs(input.investmentReturnRate) * 1000),
    );
  }

  if (input.profit < 0) {
    return pickVariant(
      [
        `王初一说：今天是小回撤，主要弱在${laggerName}。难受可以有，但别让难受替你做决定。`,
        `王初一说：今天没收好，${laggerName}走得偏软。不过这种跌法，更适合复盘，不适合赌气。`,
        `王初一说：账户今天低了点头，问题主要出在${laggerName}。记住感觉，也记住原因。`,
      ],
      Math.round(Math.abs(input.profit)),
    );
  }

  return pickVariant(
    [
      "王初一说：今天收得平，最重要的不是刺激，而是你有没有慢慢形成自己的判断方式。",
      "王初一说：今天像一节没什么掌声的训练课，不热闹，但正好拿来观察自己的节奏。",
      "王初一说：平盘日也很有价值，因为它最容易让人看清自己到底在等什么。",
    ],
    input.monthlyReturns.length,
  );
}

export function createStoryLine(input: {
  failedByCash: boolean;
  failedByDrawdown: boolean;
  monthlyProfit: number;
  lifeEvent?: LifeEvent;
  monthlyReturns: MonthlyReturn[];
}) {
  const sorted = sortReturns(input.monthlyReturns);
  const leader = sorted[0] ? findEtfName(sorted[0].etfId) : "强势ETF";
  const lagger = sorted.at(-1) ? findEtfName(sorted.at(-1)!.etfId) : "弱势ETF";

  if (input.failedByCash) {
    return pickVariant(
      [
        "王初一把账本轻轻合上：今天先到这里，现金已经撑不住继续冒险了。",
        "王初一缩了缩爪子：这局先收住吧，现金垫已经被磨穿，再扛就不是投资，是硬撑了。",
        "王初一说：今天不是没机会，而是你已经没有可以从容等机会的本金了。",
      ],
      sorted.length,
    );
  }

  if (input.failedByDrawdown) {
    return pickVariant(
      [
        "王初一抬爪提醒你：回撤越过了安全线。比起下一次冲动，现在更需要一次认真复盘。",
        "王初一说：这局不是输在没有想法，而是输在波动超过了你该承受的边界。",
        "王初一轻声补了一句：回撤线被踩穿时，最重要的不是嘴硬，而是先停下来。",
      ],
      Math.round(Math.abs(input.monthlyProfit)),
    );
  }

  if (input.lifeEvent?.cashChange && input.lifeEvent.cashChange < 0) {
    return pickVariant(
      [
        `今天除了盘面，生活也来碰了碰你。${lagger}偏弱的时候，现实支出会把压力放得更大。`,
        `今天像是两条线一起往下拽，一条是${lagger}，另一条是生活账单。`,
        `王初一说：生活费用在这种时候最像放大镜，会把${lagger}的弱势看得更扎心。`,
      ],
      Math.round(Math.abs(input.lifeEvent.cashChange)),
    );
  }

  if (input.monthlyProfit >= 0) {
    return pickVariant(
      [
        `${leader}把今天的气氛往上托了一点。王初一觉得，这种稳稳收场比一把梭更像成熟投资。`,
        `${leader}今天站了出来，让这局的尾音听起来没那么慌。王初一挺喜欢这种收法。`,
        `${leader}是今晚最亮的一盏灯。王初一说：你能把赢面留到收盘，本身就说明节奏没乱。`,
      ],
      Math.round(input.monthlyProfit),
    );
  }

  return pickVariant(
    [
      `${lagger}让今天的曲线有点拧巴。王初一说：亏损不一定糟，糟的是不知道自己为什么会亏。`,
      `${lagger}把今天的收场拉得有点别扭。王初一说：先认清原因，再决定要不要继续碰它。`,
      `${lagger}拖着尾巴往下走，王初一看了看你：这时候最需要的不是豪言，是复盘。`,
    ],
    Math.round(Math.abs(input.monthlyProfit)),
  );
}

export function buildNightIntel(day: number, monthlyReturns: MonthlyReturn[], lifeActions?: LifeActionResult[]): NightIntel[] {
  if (!lifeActions?.length) return [];

  return lifeActions.map((action, index) => {
    const sorted = sortReturns(monthlyReturns);
    const leading = sorted[index % sorted.length];
    const lagging = sorted[sorted.length - 1 - (index % sorted.length)];
    const leaderName = findEtfName(leading.etfId);
    const laggerName = findEtfName(lagging.etfId);
    const seed = day * 17 + index * 7;

    if (action.id === "listenNews") {
      return {
        id: `${action.id}-${day}-${index}`,
        source: action.id,
        title: "茶水间风向",
        content: pickVariant(
          [
            `你听到的关键词最后都绕回了${leaderName}。王初一记下：这种消息适合做线索，不适合直接当结论。`,
            `茶水间里提到最多的是${leaderName}，但大家说得越笃定，越值得你多留一个问号。`,
            `这轮闲聊最后还是把话题送到了${leaderName}。王初一说：先记方向，再记住“这只是别人说的”。`,
          ],
          seed,
        ),
        tone: leading.returnRate >= 0 ? "bullish" : "neutral",
      };
    }

    if (action.id === "deepResearch") {
      return {
        id: `${action.id}-${day}-${index}`,
        source: action.id,
        title: "研究笔记",
        content: pickVariant(
          [
            `你翻完资料后发现，今天最弱的一边是${laggerName}。研究最大的价值，不是让你更激动，而是让你少追几次热。`,
            `认真看完一轮之后，你反而先记住了${laggerName}的风险点。研究往往先帮人避坑，再帮人冲锋。`,
            `这轮资料看下来，${laggerName}的问题最清楚。王初一说：看懂“不买什么”，有时比看懂“买什么”更重要。`,
          ],
          seed,
        ),
        tone: "neutral",
      };
    }

    if (action.id === "dinnerTalk") {
      return {
        id: `${action.id}-${day}-${index}`,
        source: action.id,
        title: "饭局分析",
        content: pickVariant(
          [
            `饭桌上被反复提到的是${leaderName}，但真正有分歧的反而是${laggerName}。会聊天的人，也得会给观点打折。`,
            `这顿饭聊到最后，最被看好的还是${leaderName}，最被争论的是${laggerName}。热闹归热闹，结论得自己写。`,
            `饭局里大家都在聊${leaderName}，可王初一更在意的是：没人认真回答${laggerName}为什么会弱。`,
          ],
          seed,
        ),
        tone: "bullish",
      };
    }

    if (action.id === "focusWork") {
      return {
        id: `${action.id}-${day}-${index}`,
        source: action.id,
        title: "加班费提醒",
        content: pickVariant(
          [
            "加班费不会直接改变行情，但它保住了你下一次出手时的安全垫。现金流有时候比观点更重要。",
            "认真干活换来的不是内幕，而是底气。王初一说：账户里多一点缓冲，脑子通常也更清醒。",
            "今晚最朴素的利好，是你多了一点可支配现金。很多人忽略了，安全垫本身也是策略的一部分。",
          ],
          seed,
        ),
        tone: "neutral",
      };
    }

    return {
      id: `${action.id}-${day}-${index}`,
      source: action.id,
      title: "随机波动札记",
      content: pickVariant(
        [
          `彩票告诉你的不是方向，而是运气不能复制。今天最强是${leaderName}，最弱是${laggerName}。`,
          `运气这件事今晚没法写进模型，但王初一还是记下了：${leaderName}最亮，${laggerName}最虚。`,
          `随机惊喜不值得复刻，可市场强弱值得记录。今晚领涨的是${leaderName}，领跌的是${laggerName}。`,
        ],
        seed,
      ),
      tone: leading.returnRate >= 0 ? "neutral" : "bearish",
    };
  });
}
