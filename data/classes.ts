export type ClassName = "Wizard" | "Fighter" | "Rogue" | "Bard" | "Cleric";

export type SkillLine = {
  id: string;
  name: string;        // e.g., "魔法飞弹系"
  class: ClassName;
  skills: string[];    // 9 skill names, index 0 = tier 1, index 8 = tier 9
  emoji: string;
};

export type OwnedSkill = {
  lineId: string;
  copies: number;
  currentTier: number;
};

export type ClassState = {
  xp: number;
  scrolls: number;
  skills: OwnedSkill[];
};

export type SkillCheckResult = {
  skillName: string;
  className: ClassName;
  classLevel: number;
  dc: number;
  roll: number;
  naturalRolls: number[];
  advantageTriggered: boolean;
  modifier: number;
  success: boolean;
  critical: boolean;
  xpBonus: number;
  scrollEarned: boolean;
  scrollType: string;
  scrollCount: number;
  bonusScrollChance: number;
};

// ─── Class metadata ────────────────────────────────────────────────

export const CLASS_META: Record<ClassName, {
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  scrollName: string;
  checkSkills: string[];
  tierLabels: string[];
  label: string;
}> = {
  Wizard: {
    emoji: "🧙",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    scrollName: "奥术卷轴",
    checkSkills: ["奥术", "调查", "历史", "自然"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "策略迭代"
  },
  Fighter: {
    emoji: "⚔️",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    scrollName: "战技卷轴",
    checkSkills: ["运动", "威吓", "察觉", "生存"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "AI内化"
  },
  Rogue: {
    emoji: "🗡️",
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-300",
    scrollName: "诡术卷轴",
    checkSkills: ["隐匿", "巧手", "调查", "察觉"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "客户投放"
  },
  Bard: {
    emoji: "🎵",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    scrollName: "灵感卷轴",
    checkSkills: ["说服", "欺瞒", "表演", "历史"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "问题解决"
  },
  Cleric: {
    emoji: "✨",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-300",
    scrollName: "神恩卷轴",
    checkSkills: ["宗教", "医疗", "洞察", "说服"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "知识整理"
  }
};

export const ALL_CLASSES: ClassName[] = ["Wizard", "Fighter", "Rogue", "Bard", "Cleric"];

// ─── Tier system ─────────────────────────────────────────────────
// Tier n requires 2^(n-1) copies. Max tier = 9 (requires 2^8 = 256 copies).

export const MAX_TIER = 9;

export function getTierFromCopies(copies: number): number {
  if (copies <= 0) return 0;
  for (let t = MAX_TIER; t >= 1; t--) {
    if (copies >= Math.pow(2, t - 1)) return t;
  }
  return 0;
}

export function getCopiesForTier(tier: number): number {
  if (tier <= 0) return 0;
  return Math.pow(2, tier - 1);
}

export function getNextTierCopies(currentTier: number): number {
  if (currentTier >= MAX_TIER) return getCopiesForTier(MAX_TIER);
  return getCopiesForTier(currentTier + 1);
}

// ─── Skill Lines ─────────────────────────────────────────────────
// Each class has 5 skill lines, each line has 9 tiers of named skills.

export const SKILL_LINES: SkillLine[] = [
  // ── Wizard ──
  { id: "wizard-missile", name: "魔法飞弹系", class: "Wizard", emoji: "🚀",
    skills: ["魔法飞弹", "强效魔法飞弹", "奥术飞弹", "秘法飞弹", "奥术洪流", "奥术风暴", "奥术毁灭", "奥术灾变", "许愿术"] },
  { id: "wizard-shield", name: "护盾系", class: "Wizard", emoji: "🛡️",
    skills: ["护盾术", "镜影术", "反制法术", "高等隐形术", "毕格比之手", "全球护卫术", "力场监牢", "心灵堡垒", "时间停止"] },
  { id: "wizard-fire", name: "火焰系", class: "Wizard", emoji: "🔥",
    skills: ["燃烧之手", "灼热射线", "火球术", "火墙术", "焰击术", "连锁闪电", "延迟爆裂火球", "焚云术", "流星爆"] },
  { id: "wizard-teleport", name: "传送系", class: "Wizard", emoji: "🌀",
    skills: ["跳跃术", "迷踪步", "飞行术", "任意门", "传送法阵", "真知术", "异界传送", "迷宫术", "传送门"] },
  { id: "wizard-control", name: "控制系", class: "Wizard", emoji: "🔮",
    skills: ["睡眠术", "定身术", "催眠图纹", "变形术", "支配人类", "石化术", "指定目标支配", "支配怪物", "预警术"] },

  // ── Fighter ──
  { id: "fighter-surge", name: "动作激增系", class: "Fighter", emoji: "⚡",
    skills: ["动作激增", "强化动作激增", "双重动作激增", "战神动作激增", "英雄动作激增", "神速行动", "时空行动", "超越行动", "无限行动"] },
  { id: "fighter-precision", name: "精准打击系", class: "Fighter", emoji: "🎯",
    skills: ["精准打击", "强化精准打击", "致命打击", "斩首打击", "传奇精准打击", "神射打击", "天罚打击", "宿命打击", "必杀一击"] },
  { id: "fighter-cleave", name: "顺劈系", class: "Fighter", emoji: "⚔️",
    skills: ["顺劈斩", "旋风斩", "战争旋风", "破军斩", "百裂斩", "风暴斩", "战神乱舞", "末日斩", "世界终结斩"] },
  { id: "fighter-charge", name: "冲锋系", class: "Fighter", emoji: "🐎",
    skills: ["冲锋", "猛烈冲锋", "战吼冲锋", "雷霆冲锋", "裂地冲锋", "狂怒突袭", "破城冲锋", "彗星冲锋", "神罚冲锋"] },
  { id: "fighter-defense", name: "防御系", class: "Fighter", emoji: "🏰",
    skills: ["招架", "防御姿态", "钢铁防线", "不屈壁垒", "铁壁守护", "永恒守卫", "不灭意志", "泰坦壁垒", "不朽战神"] },

  // ── Rogue ──
  { id: "rogue-sneak", name: "偷袭系", class: "Rogue", emoji: "🔪",
    skills: ["偷袭", "强化偷袭", "精准偷袭", "影袭", "夜刃袭击", "幽影突袭", "影界穿刺", "黑夜降临", "死神之击"] },
  { id: "rogue-cunning", name: "灵巧动作系", class: "Rogue", emoji: "🏃",
    skills: ["灵巧动作", "疾跑", "影步", "暗影跃迁", "相位移动", "时空步", "维度穿梭", "虚空瞬移", "无限机动"] },
  { id: "rogue-evasion", name: "闪避系", class: "Rogue", emoji: "💨",
    skills: ["闪避", "强化闪避", "完美闪避", "绝对闪避", "幻影闪避", "无伤闪避", "神级闪避", "不可命中", "命运规避"] },
  { id: "rogue-stealth", name: "潜行系", class: "Rogue", emoji: "🌑",
    skills: ["潜行", "隐匿", "暗影潜行", "幽影潜伏", "虚空潜行", "虚影漫步", "影界行者", "虚空潜伏", "完全隐匿"] },
  { id: "rogue-assassinate", name: "暗杀系", class: "Rogue", emoji: "💀",
    skills: ["暗杀", "致命暗杀", "无声暗杀", "断喉", "死亡标记", "致命处决", "死亡宣告", "终焉刺杀", "一击必杀"] },

  // ── Bard ──
  { id: "bard-inspire", name: "吟游激励系", class: "Bard", emoji: "🎶",
    skills: ["吟游激励", "强化激励", "英雄激励", "传奇激励", "命运激励", "神话激励", "永恒激励", "众神激励", "命运之歌"] },
  { id: "bard-charm", name: "魅惑系", class: "Bard", emoji: "💕",
    skills: ["魅惑人类", "建议术", "催眠图纹", "强制舞蹈", "支配人类", "群体魅惑", "强制支配", "支配怪物", "真正支配"] },
  { id: "bard-heal", name: "治愈系", class: "Bard", emoji: "💚",
    skills: ["治疗真言", "群体治疗", "治疗术", "群体治疗术", "高等复原术", "治疗术群体版", "再生术", "群体再生", "完全复苏"] },
  { id: "bard-illusion", name: "幻术系", class: "Bard", emoji: "🪞",
    skills: ["塔莎狂笑术", "镜影术", "高等幻影", "幻景", "梦境", "程序幻影", "幻术迷宫", "心灵幻境", "伟大幻景"] },
  { id: "bard-legend", name: "传说系", class: "Bard", emoji: "📖",
    skills: ["传说知识", "英雄传记", "古老传说", "失落史诗", "龙之传说", "英雄史诗", "众神传说", "创世传说", "世界史诗"] },

  // ── Cleric ──
  { id: "cleric-heal", name: "治疗系", class: "Cleric", emoji: "💚",
    skills: ["治疗真言", "治疗术", "群体治疗真言", "高等治疗术", "群体治疗术", "治愈术", "群体治愈术", "神圣治愈", "群体治疗祷言"] },
  { id: "cleric-bless", name: "祝福系", class: "Cleric", emoji: "🙏",
    skills: ["祝福术", "强效祝福", "希望信标", "圣光护佑", "圣洁武器", "神圣光环", "圣言术", "神圣领域", "群体祝福"] },
  { id: "cleric-smite", name: "神圣攻击系", class: "Cleric", emoji: "⚡",
    skills: ["引导箭", "灵体武器", "守卫刻文", "信仰守卫", "焰击术", "刀刃屏障", "圣光审判", "天界打击", "神罚降临"] },
  { id: "cleric-ward", name: "防护系", class: "Cleric", emoji: "🛡️",
    skills: ["庇护术", "援助术", "防护能量", "防死结界", "高等复原术", "英雄宴会", "再生术", "神圣结界", "圣域降世"] },
  { id: "cleric-revive", name: "复活系", class: "Cleric", emoji: "✨",
    skills: ["稳定术", "复苏", "死者复生", "复活术", "真正复活", "灵魂归来", "奇迹复生", "圣灵复活", "完全复活"] },
];

// ─── Helper functions ──────────────────────────────────────────────

export function getClassLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

function rollWeightedD20(classLevel: number): {
  roll: number;
  naturalRolls: number[];
  advantageTriggered: boolean;
} {
  const first = Math.floor(Math.random() * 20) + 1;
  const advantageChance = Math.min(0.7, Math.max(0, classLevel - 1) * 0.02);

  if (Math.random() >= advantageChance) {
    return {
      roll: first,
      naturalRolls: [first],
      advantageTriggered: false
    };
  }

  const second = Math.floor(Math.random() * 20) + 1;

  return {
    roll: Math.max(first, second),
    naturalRolls: [first, second],
    advantageTriggered: true
  };
}

function getScrollRewardCount(classLevel: number, critical: boolean): {
  scrollCount: number;
  bonusScrollChance: number;
} {
  if (!critical) {
    return {
      scrollCount: 0,
      bonusScrollChance: 0
    };
  }

  if (classLevel <= 1) {
    return {
      scrollCount: 1,
      bonusScrollChance: 0
    };
  }

  const bonusScrollChance = Math.min(50, classLevel);

  return {
    scrollCount: Math.random() * 100 < bonusScrollChance ? 2 : 1,
    bonusScrollChance
  };
}

export function getClassLines(className: ClassName): SkillLine[] {
  return SKILL_LINES.filter((l) => l.class === className);
}

export function getAvailableLines(className: ClassName, owned: OwnedSkill[]): SkillLine[] {
  const classLines = getClassLines(className);
  const ownedIds = new Set(owned.map((o) => o.lineId));
  return classLines.filter((l) => !ownedIds.has(l.id));
}

export function getLineById(lineId: string): SkillLine | undefined {
  return SKILL_LINES.find((l) => l.id === lineId);
}

export function getSkillNameAtTier(line: SkillLine, tier: number): string {
  if (tier < 1 || tier > line.skills.length) return line.name;
  return line.skills[tier - 1];
}

export function rollSkillCheck(className: ClassName, classLevel: number): SkillCheckResult {
  const meta = CLASS_META[className];
  const skillName = meta.checkSkills[Math.floor(Math.random() * meta.checkSkills.length)];
  const dc = 10 + Math.floor(Math.random() * 6);
  const { roll, naturalRolls, advantageTriggered } = rollWeightedD20(classLevel);
  const modifier = Math.floor(classLevel / 2);
  const total = roll + modifier;
  const critical = roll === 20;
  const success = critical || total >= dc;
  const xpBonus = critical ? 10 : success ? 5 : 0;
  const scrollEarned = critical;
  const { scrollCount, bonusScrollChance } = getScrollRewardCount(classLevel, critical);

  return {
    skillName,
    className,
    classLevel,
    dc,
    roll,
    naturalRolls,
    advantageTriggered,
    modifier,
    success,
    critical,
    xpBonus,
    scrollEarned,
    scrollType: meta.scrollName,
    scrollCount,
    bonusScrollChance
  };
}

export function learnSkillFromScroll(className: ClassName, ownedSkills: OwnedSkill[]): {
  lineId: string;
  isNew: boolean;
  upgraded: boolean;
  fromTier: number;
  toTier: number;
} | null {
  const available = getAvailableLines(className, ownedSkills);

  if (available.length > 0) {
    // Learn a new line at tier 1
    const pick = available[Math.floor(Math.random() * available.length)];
    return { lineId: pick.id, isNew: true, upgraded: false, fromTier: 0, toTier: 1 };
  }

  // All lines learned - give a duplicate (potential upgrade)
  if (ownedSkills.length > 0) {
    const pick = ownedSkills[Math.floor(Math.random() * ownedSkills.length)];
    const newCopies = pick.copies + 1;
    const oldTier = pick.currentTier;
    const newTier = getTierFromCopies(newCopies);
    const upgraded = newTier > oldTier;
    return {
      lineId: pick.lineId,
      isNew: false,
      upgraded,
      fromTier: oldTier,
      toTier: upgraded ? newTier : oldTier
    };
  }

  return null;
}

export function getTierLabel(className: ClassName, tier: number): string {
  return CLASS_META[className].tierLabels[tier] ?? `${tier}环`;
}

export function initClassState(): Record<ClassName, ClassState> {
  return {
    Wizard: { xp: 0, scrolls: 0, skills: [] },
    Fighter: { xp: 0, scrolls: 0, skills: [] },
    Rogue: { xp: 0, scrolls: 0, skills: [] },
    Bard: { xp: 0, scrolls: 0, skills: [] },
    Cleric: { xp: 0, scrolls: 0, skills: [] }
  };
}

// Keep map regions
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
