export type CompanionRarity = 3 | 4 | 5;

export type Companion = {
  id: string;
  name: string;
  rarity: CompanionRarity;
  emoji: string;
  description: string;
  quote: string;
};

export const ALL_COMPANIONS: Companion[] = [
  // 3 星
  {
    id: "cat-coder",
    name: "程序员猫咪",
    rarity: 3,
    emoji: "🐱",
    description: "一只喜欢在键盘上踩来踩去的猫咪，据说踩出来的代码偶尔能跑。",
    quote: "喵～今天也慢慢推进吧。"
  },
  {
    id: "coffee-spirit",
    name: "咖啡小精灵",
    rarity: 3,
    emoji: "🧚",
    description: "住在咖啡杯里的小精灵，每次你喝咖啡它就会开心地跳舞。",
    quote: "再来一杯，我还能继续！"
  },
  {
    id: "debug-hamster",
    name: "Debug 仓鼠",
    rarity: 3,
    emoji: "🐹",
    description: "一只在滚轮上不停跑的仓鼠，象征着你永无止境的 Debug 之旅。",
    quote: "跑起来了！虽然不知道跑去哪…"
  },
  {
    id: "doc-penguin",
    name: "文档企鹅",
    rarity: 3,
    emoji: "🐧",
    description: "一只认真整理文档的企鹅，总是提醒你写 README。",
    quote: "文档写好了吗？嗯？"
  },
  // 4 星
  {
    id: "prompt-alchemist",
    name: "Prompt 炼金术师",
    rarity: 4,
    emoji: "🧙",
    description: "精通 Prompt 工程的炼金术师，能把模糊的需求变成精确的指令。",
    quote: "精确的 Prompt 就是最好的魔法。"
  },
  {
    id: "code-knight",
    name: "代码骑士",
    rarity: 4,
    emoji: "⚔️",
    description: "守护代码质量的骑士，永远站在 Code Review 的最前线。",
    quote: "代码整洁，心灵安宁！"
  },
  {
    id: "meeting-ninja",
    name: "会议忍者",
    rarity: 4,
    emoji: "🥷",
    description: "能在任何会议中保持清醒的忍者，擅长用一句话总结一小时的内容。",
    quote: "我来，我见，我总结。"
  },
  {
    id: "bug-hunter",
    name: "Bug 猎人",
    rarity: 4,
    emoji: "🔍",
    description: "追踪 Bug 的专业猎人，据说没有他找不到的 Bug。",
    quote: "Bug 在哪？交给我。"
  },
  // 5 星
  {
    id: "agent-summoner",
    name: "Agent 召唤师",
    rarity: 5,
    emoji: "🌟",
    description: "能同时驾驭多个 AI Agent 的传说级召唤师，工作流在她手中如行云流水。",
    quote: "所有 Agent，听我号令！"
  },
  {
    id: "time-mage",
    name: "时间魔导师",
    rarity: 5,
    emoji: "⏳",
    description: "掌控时间流的大魔导师，能让专注时间延长三倍。",
    quote: "时间，由我来掌控。"
  },
  {
    id: "architect-sage",
    name: "架构贤者",
    rarity: 5,
    emoji: "🏛️",
    description: "洞悉系统全貌的贤者，任何架构难题在他面前都无所遁形。",
    quote: "先看全局，再写代码。"
  },
  {
    id: "deep-work-dragon",
    name: "深度工作龙",
    rarity: 5,
    emoji: "🐉",
    description: "传说中能进入深度工作状态的远古巨龙，一切干扰在它面前化为虚无。",
    quote: "静下心来，一切都会完成。"
  }
];

export const RARITY_CONFIG: Record<CompanionRarity, { label: string; color: string; bgColor: string; borderColor: string; glowColor: string }> = {
  3: { label: "★★★", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-300", glowColor: "#94a3b8" },
  4: { label: "★★★★", color: "text-violet-700", bgColor: "bg-violet-50", borderColor: "border-violet-300", glowColor: "#8b5cf6" },
  5: { label: "★★★★★", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-300", glowColor: "#f59e0b" }
};

export const GACHA_COST_SINGLE = 10;
export const GACHA_COST_TEN = 100;

export function rollCompanion(): Companion {
  const roll = Math.random() * 100;
  let rarity: CompanionRarity;

  if (roll < 3) {
    rarity = 5;
  } else if (roll < 20) {
    rarity = 4;
  } else {
    rarity = 3;
  }

  const pool = ALL_COMPANIONS.filter((c) => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function rollTen(): Companion[] {
  const results: Companion[] = [];
  let hasGuaranteed4Plus = false;

  for (let i = 0; i < 10; i++) {
    const result = rollCompanion();
    results.push(result);
    if (result.rarity >= 4) {
      hasGuaranteed4Plus = true;
    }
  }

  // 保底：如果十连没有4星以上，最后一个替换为4星
  if (!hasGuaranteed4Plus) {
    const fourStars = ALL_COMPANIONS.filter((c) => c.rarity === 4);
    results[9] = fourStars[Math.floor(Math.random() * fourStars.length)];
  }

  return results;
}

// 地图区域
export type MapRegion = {
  id: string;
  name: string;
  emoji: string;
  minProgress: number;
  maxProgress: number;
};

export const MAP_REGIONS: MapRegion[] = [
  { id: "camp", name: "起点营地", emoji: "⛺", minProgress: 0, maxProgress: 4 },
  { id: "forest", name: "灵感森林", emoji: "🌲", minProgress: 5, maxProgress: 9 },
  { id: "canyon", name: "深度峡谷", emoji: "🏔️", minProgress: 10, maxProgress: 24 },
  { id: "tower", name: "架构高塔", emoji: "🗼", minProgress: 25, maxProgress: 49 },
  { id: "stars", name: "星辰实验室", emoji: "🌌", minProgress: 50, maxProgress: Infinity }
];

export function getMapRegion(progressCount: number): MapRegion {
  return MAP_REGIONS.find((r) => progressCount >= r.minProgress && progressCount <= r.maxProgress) ?? MAP_REGIONS[0];
}

// 伙伴对话
export type CompanionMood = "idle" | "progress" | "momentum" | "focusChange" | "allActiveProgressed";

export const COMPANION_LINES: Record<CompanionMood, string[]> = {
  idle: [
    "今天也慢慢推进吧。",
    "准备好了吗？",
    "专注当下，一步就好。",
    "我在陪着你呢。"
  ],
  progress: [
    "漂亮，又往前走了一步！",
    "不错不错，继续加油！",
    "每一步都算数的。",
    "好样的！又推进了！"
  ],
  momentum: [
    "Momentum 起飞了！",
    "连续推进！停不下来！",
    "这节奏太棒了！",
    "火力全开！"
  ],
  focusChange: [
    "切换战场，继续冒险。",
    "新的任务，新的可能！",
    "准备好了，出发！"
  ],
  allActiveProgressed: [
    "今天的冒险很完整！",
    "所有任务都在推进！太厉害了！",
    "这就是全面发展的力量！"
  ]
};

export function getCompanionLine(mood: CompanionMood): string {
  const lines = COMPANION_LINES[mood];
  return lines[Math.floor(Math.random() * lines.length)];
}
