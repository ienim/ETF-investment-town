import type { LifeEvent } from "../types/game";

const lifeEvents: LifeEvent[] = [
  { id: "salary", title: "发工资了", description: "兼职/项目款到账，现金安全感偷偷上涨。", cashChange: 1800, mood: "good" },
  { id: "rent", title: "交房租", description: "现实生活准时敲门：房租扣款。明天最好留足现金。", cashChange: -2000, mood: "bad", nextDayCashRequired: 8000 },
  { id: "medical", title: "突然看医生", description: "小病小痛也会影响现金流，身体是第一资产。", cashChange: -700, mood: "bad" },
  { id: "coupon", title: "薅到生活券", description: "平台补贴到账，虽然不多，但可以加餐。", cashChange: 200, mood: "good" },
  { id: "family-dinner", title: "家庭聚餐", description: "请家人吃饭，账户少了一点，幸福感多了一点。", cashChange: -450, mood: "neutral", timeCostSeconds: 10 },
  { id: "lottery-small", title: "小额中奖", description: "不是财务自由，但足够让今天的奶茶更有底气。", cashChange: 500, mood: "good" },
  { id: "phone-repair", title: "手机维修", description: "屏幕碎了，投资人也要面对现实折旧。", cashChange: -600, mood: "bad" },
  { id: "parent-visit", title: "爸妈来看你", description: "爸妈来了，带他们吃了顿饭又塞了点生活费。", cashChange: -1500, mood: "bad", timeCostSeconds: 15 },
  { id: "wedding-gift", title: "朋友结婚随份子", description: "红色炸弹来袭，份子钱是成年人社交的必修课。", cashChange: -1000, mood: "bad" },
  { id: "pet-sick", title: "宠物生病了", description: "毛孩子不舒服，宠物医院账单让人清醒。", cashChange: -900, mood: "bad", timeCostSeconds: 12 },
  { id: "dental", title: "牙医看牙", description: "牙疼不是病，疼起来真要命，账单也是。", cashChange: -800, mood: "bad" },
  { id: "traffic-fine", title: "交通违章罚款", description: "一不小心闯了个红灯，罚款比停车费贵多了。", cashChange: -300, mood: "bad" },
  { id: "appliance-repair", title: "家电坏了换新", description: "洗衣机突然罢工，不得不换一台。", cashChange: -1200, mood: "bad", timeCostSeconds: 8 },
  { id: "property-fee", title: "小区物业费", description: "物业管理费账单准时到达。", cashChange: -500, mood: "bad" },
  { id: "health-checkup", title: "体检套餐", description: "公司体检不覆盖的项目，自己加了一个。", cashChange: -650, mood: "neutral", timeCostSeconds: 20 },
  { id: "social-dinner", title: "社交聚餐", description: "老朋友约饭，聊得很开心但掏钱时有点痛。", cashChange: -350, mood: "neutral", timeCostSeconds: 10 },
  { id: "course-enroll", title: "报名课程", description: "看到一门不错的课，咬咬牙报了名。", cashChange: -1000, mood: "neutral", timeCostSeconds: 25 },
  { id: "gym-card", title: "健身房年卡", description: "冲动消费了一张年卡，希望这次不是三分钟热度。", cashChange: -800, mood: "neutral" },
  { id: "red-packet", title: "收到红包", description: "长辈/朋友发来红包，意外之喜。", cashChange: 600, mood: "good" },
  { id: "tax-refund", title: "退税到账", description: "年度汇算清缴退了一笔税，像捡到钱一样开心。", cashChange: 1500, mood: "good" },
  { id: "side-job", title: "兼职收入", description: "周末接了个活，赚了点外快。", cashChange: 1200, mood: "good", timeCostSeconds: 20 },
  { id: "sell-old-stuff", title: "二手回血", description: "清理闲置卖了点钱，断舍离还能赚钱。", cashChange: 350, mood: "good" },
  { id: "medical-reimburse", title: "医疗报销", description: "上次看病的报销到账了，回了一点血。", cashChange: 400, mood: "good" },
  { id: "credit-card-fee", title: "信用卡年费", description: "信用卡年费扣款，打电话给客服磨了半天没免掉。", cashChange: -200, mood: "bad" },
  { id: "black-crash", title: "临时失业冲击", description: "原本稳定的收入突然中断，今天得先给生活兜底。", cashChange: -3600, mood: "bad", nextDayCashRequired: 9000, timeCostSeconds: 18 },
  { id: "black-fraud", title: "账户被坑了一笔", description: "生活里总有防不住的坑，白白损失了一笔钱。", cashChange: -4200, mood: "bad", nextDayCashRequired: 10000, timeCostSeconds: 20 },
  { id: "black-career", title: "项目黄了", description: "本来指望到账的项目款突然没了，现金计划被打乱。", cashChange: -3000, mood: "bad", nextDayCashRequired: 8500, timeCostSeconds: 15 },
  { id: "black-health", title: "家里临时用钱", description: "家里突然有事，需要立刻转一笔钱回去。", cashChange: -4800, mood: "bad", nextDayCashRequired: 12000, timeCostSeconds: 22 },
  { id: "no-event", title: "生活平静", description: "今天没有额外现金流，专心复盘交易。", cashChange: 0, mood: "neutral" },
];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 73.17 + 5.3) * 10000;
  return x - Math.floor(x);
}

export function getLifeEventForDay(day: number): LifeEvent | undefined {
  if (day < 3) return undefined;

  if (day === 3) {
    return lifeEvents.find((e) => e.id === "rent")!;
  }

  if (day === 6) {
    return lifeEvents.find((e) => e.id === "property-fee")!;
  }

  // Day 9+: 7% chance of black swan catastrophic event
  if (day > 8) {
    const blackRoll = seededRandom(day * 31 + 17);
    if (blackRoll > 0.93) {
      const ids = ["black-crash", "black-fraud", "black-career", "black-health"];
      const pick = ids[Math.floor(seededRandom(day * 73) * ids.length)];
      const found = lifeEvents.find((e) => e.id === pick);
      if (found) return found;
    }
  }

  const triggerRoll = seededRandom(day * 11 + 37);
  if (triggerRoll > 0.58) return undefined;

  const pool = lifeEvents.filter((e) => e.id !== "rent" && e.id !== "no-event");
  const index = Math.floor(seededRandom(day * 23) * pool.length);
  return pool[index];
}
