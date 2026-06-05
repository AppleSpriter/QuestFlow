import type { ClassName } from "./classes";

export type ResonanceRewardType = "xp" | "scroll" | "fatigue" | "advantage" | "lucky" | "doubleScroll" | "longRestScroll";

export type ResonanceReward = {
  type: ResonanceRewardType;
  label: string;
  shortLabel: string;
  detail: string;
  emoji: string;
};

export type ResonanceDefinition = {
  key: string;
  classes: [ClassName, ClassName];
  name: string;
  badge: string;
  reward: ResonanceReward;
  description: string;
};

export type DiscoveredResonance = {
  key: string;
  discoveredAt: string;
  triggerCount: number;
};

export type ResonanceBuffs = {
  advantageChecks: number;
  luckyChecks: number;
  doubleScrolls: number;
  longRestScrolls: number;
};

export type ResonanceTrigger = {
  key: string;
  name: string;
  classes: [ClassName, ClassName];
  reward: ResonanceReward;
  description: string;
  discoveredAt: string;
  triggerCount: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  chainCount: number;
  chainBonus: boolean;
  isNew: boolean;
};

export type ResonanceChainState = {
  count: number;
  lastClass?: ClassName;
};

export const RESONANCE_REWARDS: Record<ResonanceRewardType, ResonanceReward> = {
  xp: { type: "xp", label: "+3 XP", shortLabel: "XP +3", detail: "获得额外 XP +3", emoji: "✨" },
  scroll: { type: "scroll", label: "+1卷轴", shortLabel: "卷轴 ×1", detail: "获得额外卷轴 ×1", emoji: "📜" },
  fatigue: { type: "fatigue", label: "-10 Fatigue", shortLabel: "疲劳 -10", detail: "恢复专注，当前职业疲劳 -10", emoji: "💚" },
  advantage: { type: "advantage", label: "优势检定", shortLabel: "下次优势", detail: "下次检定获得 Advantage", emoji: "🎲" },
  lucky: { type: "lucky", label: "幸运检定", shortLabel: "幸运检定", detail: "下次检定大成功率 +5%", emoji: "🍀" },
  doubleScroll: { type: "doubleScroll", label: "双卷轴", shortLabel: "卷轴 +1", detail: "下次获得卷轴时数量 +1", emoji: "📚" },
  longRestScroll: { type: "longRestScroll", label: "长休+1卷轴", shortLabel: "长休卷轴 +1", detail: "下次长休额外获得卷轴 ×1", emoji: "🌙" }
};

export function getResonanceLevel(triggerCount: number): number {
  if (triggerCount >= 100) return 5;
  if (triggerCount >= 50) return 4;
  if (triggerCount >= 20) return 3;
  if (triggerCount >= 5) return 2;
  return triggerCount >= 1 ? 1 : 0;
}

const badgeByReward: Record<ResonanceRewardType, string> = {
  xp: "✨",
  scroll: "🔥",
  fatigue: "🌿",
  advantage: "⚡",
  lucky: "🍀",
  doubleScroll: "💥",
  longRestScroll: "🌙"
};

const badgeOverrides: Record<string, string> = {
  "Wizard+Fighter": "🔥",
  "Wizard+Rogue": "🔮",
  "Wizard+Bard": "📚",
  "Wizard+Cleric": "🌙",
  "Fighter+Bard": "🎺",
  "Fighter+Cleric": "🛡️",
  "Rogue+Bard": "🎭",
  "Rogue+Cleric": "🌑",
  "Monk+Barbarian": "🧘"
};

const descriptions: Record<string, string> = {
  "Wizard+Fighter": "奥术与武技交织，形成兼具爆发与执行力的战斗风格。",
  "Wizard+Rogue": "法术的精密与潜行的机敏融合，擅长绕开阻碍直达核心。",
  "Wizard+Bard": "知识、表达与推演汇聚，让复杂问题变得清晰可讲。",
  "Wizard+Cleric": "奥秘与信念相互印证，为长期探索点亮方向。",
  "Monk+Barbarian": "静心与狂怒并存，把爆发力收束成可控的极限专注。"
};

const pairs: Array<[ClassName, ClassName, string, ResonanceRewardType]> = [
  ["Wizard", "Fighter", "魔剑士", "scroll"], ["Wizard", "Rogue", "奥术诡术师", "advantage"], ["Wizard", "Bard", "博学贤者", "xp"], ["Wizard", "Cleric", "奥秘先知", "longRestScroll"], ["Wizard", "Paladin", "圣奥术师", "scroll"], ["Wizard", "Ranger", "星界猎手", "lucky"], ["Wizard", "Druid", "自然贤者", "fatigue"], ["Wizard", "Warlock", "禁忌学者", "doubleScroll"], ["Wizard", "Sorcerer", "双生施法者", "xp"], ["Wizard", "Monk", "心灵法师", "advantage"], ["Wizard", "Barbarian", "狂怒奥术师", "scroll"],
  ["Fighter", "Rogue", "暗影猎手", "lucky"], ["Fighter", "Bard", "战歌统帅", "fatigue"], ["Fighter", "Cleric", "圣战士", "xp"], ["Fighter", "Paladin", "誓约骑士", "scroll"], ["Fighter", "Ranger", "荒野游侠", "advantage"], ["Fighter", "Druid", "自然守卫", "fatigue"], ["Fighter", "Warlock", "诅咒战士", "doubleScroll"], ["Fighter", "Sorcerer", "战斗法师", "scroll"], ["Fighter", "Monk", "武道宗师", "xp"], ["Fighter", "Barbarian", "狂战领主", "lucky"],
  ["Rogue", "Bard", "情报大师", "scroll"], ["Rogue", "Cleric", "夜行守护者", "fatigue"], ["Rogue", "Paladin", "审判之刃", "lucky"], ["Rogue", "Ranger", "猎影者", "advantage"], ["Rogue", "Druid", "林间潜行者", "xp"], ["Rogue", "Warlock", "暗契刺客", "doubleScroll"], ["Rogue", "Sorcerer", "幻影术士", "scroll"], ["Rogue", "Monk", "无影行者", "advantage"], ["Rogue", "Barbarian", "血刃狂徒", "lucky"],
  ["Bard", "Cleric", "圣歌使徒", "longRestScroll"], ["Bard", "Paladin", "荣耀使者", "xp"], ["Bard", "Ranger", "传说猎人", "scroll"], ["Bard", "Druid", "森林吟游者", "fatigue"], ["Bard", "Warlock", "禁忌诗人", "doubleScroll"], ["Bard", "Sorcerer", "命运咏唱者", "lucky"], ["Bard", "Monk", "禅意诗人", "advantage"], ["Bard", "Barbarian", "战歌狂徒", "xp"],
  ["Cleric", "Paladin", "圣光裁决者", "scroll"], ["Cleric", "Ranger", "黎明守望者", "xp"], ["Cleric", "Druid", "生命守护者", "fatigue"], ["Cleric", "Warlock", "堕落先知", "doubleScroll"], ["Cleric", "Sorcerer", "神选者", "lucky"], ["Cleric", "Monk", "苦修圣徒", "advantage"], ["Cleric", "Barbarian", "神怒执行者", "scroll"],
  ["Paladin", "Ranger", "银月骑士", "xp"], ["Paladin", "Druid", "远古守卫", "fatigue"], ["Paladin", "Warlock", "堕誓者", "doubleScroll"], ["Paladin", "Sorcerer", "圣血后裔", "scroll"], ["Paladin", "Monk", "誓言修行者", "advantage"], ["Paladin", "Barbarian", "神罚狂战士", "lucky"],
  ["Ranger", "Druid", "荒野之心", "fatigue"], ["Ranger", "Warlock", "夜幕追猎者", "doubleScroll"], ["Ranger", "Sorcerer", "风暴猎人", "scroll"], ["Ranger", "Monk", "逐风行者", "advantage"], ["Ranger", "Barbarian", "兽王猎手", "lucky"],
  ["Druid", "Warlock", "枯萎先知", "doubleScroll"], ["Druid", "Sorcerer", "元素之子", "scroll"], ["Druid", "Monk", "自然苦修者", "fatigue"], ["Druid", "Barbarian", "原始泰坦", "lucky"],
  ["Warlock", "Sorcerer", "混沌使徒", "doubleScroll"], ["Warlock", "Monk", "虚空行者", "advantage"], ["Warlock", "Barbarian", "深渊狂怒", "lucky"],
  ["Sorcerer", "Monk", "气脉术师", "advantage"], ["Sorcerer", "Barbarian", "风暴化身", "scroll"],
  ["Monk", "Barbarian", "怒禅大师", "fatigue"]
];

export const getResonanceKey = (a: ClassName, b: ClassName): string => [a, b].sort().join("+");

export const RESONANCE_DEFINITIONS: ResonanceDefinition[] = pairs.map(([a, b, name, rewardType]) => {
  const key = getResonanceKey(a, b);
  return {
    key,
    classes: [a, b],
    name,
    badge: badgeOverrides[key] ?? badgeByReward[rewardType],
    reward: RESONANCE_REWARDS[rewardType],
    description: descriptions[key] ?? `${a} 与 ${b} 的力量产生共鸣，鼓励你在不同类型任务之间自然切换。`
  };
});

export const RESONANCE_MAP = Object.fromEntries(
  RESONANCE_DEFINITIONS.map((definition) => [definition.key, definition])
) as Record<string, ResonanceDefinition>;

export const createInitialResonanceBuffs = (): ResonanceBuffs => ({
  advantageChecks: 0,
  luckyChecks: 0,
  doubleScrolls: 0,
  longRestScrolls: 0
});
