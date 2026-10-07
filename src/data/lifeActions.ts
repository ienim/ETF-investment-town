import type { LifeActionResult } from "../types/game";

export interface LifeActionOption {
  id: LifeActionResult["id"];
  title: string;
  teaser: string;
  getResult: (day: number) => LifeActionResult;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 61.7 + 9.13) * 10000;
  return x - Math.floor(x);
}

export const lifeActions: LifeActionOption[] = [
  {
    id: "listenNews",
    title: "听小道消息",
    teaser: "在茶水间假装接水。",
    getResult: () => ({
      id: "listenNews",
      title: "听小道消息",
      description: "你听到几句市场风向，但白天时间也被悄悄吃掉了一截。",
      cashChange: 0,
      timeCostSeconds: 15,
    }),
  },
  {
    id: "deepResearch",
    title: "认真研究",
    teaser: "翻资料、看财报、做笔记。",
    getResult: () => ({
      id: "deepResearch",
      title: "认真研究",
      description: "你认真研究了一轮，王初一说：信息变清楚了，但操作窗口也短了一些。",
      cashChange: 0,
      timeCostSeconds: 30,
    }),
  },
  {
    id: "dinnerTalk",
    title: "约饭请教",
    teaser: "饭桌上常常比评论区更诚实。",
    getResult: (day) => {
      const cost = [180, 300, 520][Math.floor(seededRandom(day * 17) * 3)] ?? 300;
      return {
        id: "dinnerTalk",
        title: "约饭请教",
        description: "朋友讲了一套分析框架，账单也很真实。",
        cashChange: -cost,
        timeCostSeconds: 20,
      };
    },
  },
  {
    id: "lottery",
    title: "挂一张彩票",
    teaser: "不是投资建议，只是生活随机性。",
    getResult: (day) => {
      const roll = seededRandom(day * 31);
      const prize = roll > 0.94 ? 2500 : roll > 0.78 ? 300 : 0;
      return {
        id: "lottery",
        title: "挂一张彩票",
        description: prize > 0 ? "彩票居然中了！" : "彩票没有中奖。",
        cashChange: prize - 20,
        timeCostSeconds: 5,
      };
    },
  },
  {
    id: "focusWork",
    title: "认真上班",
    teaser: "努力工作，也是现金流管理。",
    getResult: (day) => {
      const bonus = seededRandom(day * 43) > 0.68 ? 800 : 0;
      return {
        id: "focusWork",
        title: "认真上班",
        description: bonus > 0 ? "今天工作状态不错，临时奖金到账。" : "今天认真上班，心态稳了一点。",
        cashChange: bonus,
        timeCostSeconds: 25,
      };
    },
  },
  {
    id: "exercise",
    title: "健身锻炼",
    teaser: "身体是革命的本钱。",
    getResult: () => ({
      id: "exercise",
      title: "健身锻炼",
      description: "出了一身汗，心情好了不少。",
      cashChange: 0,
      timeCostSeconds: 25,
    }),
  },
  {
    id: "readBook",
    title: "读书学习",
    teaser: "翻翻经典，也许有新启发。",
    getResult: () => ({
      id: "readBook",
      title: "读书学习",
      description: "读了一本投资书，感觉自己变聪明了一点。",
      cashChange: 0,
      timeCostSeconds: 30,
    }),
  },
  {
    id: "cookMeal",
    title: "自己做饭",
    teaser: "省钱又健康。",
    getResult: (day) => ({
      id: "cookMeal",
      title: "自己做饭",
      description: "自己做饭省了点钱，但也花了点时间。",
      cashChange: 50,
      timeCostSeconds: 20,
    }),
  },
];
