import type { SkillCard, SkillId } from "../types/game";

export const skillCards: SkillCard[] = [
  {
    id: "gossipRadar",
    name: "情报雷达",
    icon: "讯",
    description: "每月额外看到几条小道消息，真假混杂，但有时能提前感到风向。",
  },
  {
    id: "cashFlow",
    name: "现金补给",
    icon: "钱",
    description: "每月结算后获得 3000 现金补给，适合分批买入和留安全垫。",
  },
  {
    id: "riskNotebook",
    name: "风控笔记",
    icon: "稳",
    description: "王初一会给更多稳健提示，任务失败罚金降低 30%。",
  },
];

export function pickSkillByMonth(month: number, owned: SkillCard[]) {
  const order: SkillId[] = ["gossipRadar", "cashFlow", "riskNotebook"];
  const id = order[(month - 1) % order.length];
  const alreadyOwned = new Set(owned.map((skill) => skill.id));
  return skillCards.find((skill) => skill.id === id && !alreadyOwned.has(skill.id));
}
