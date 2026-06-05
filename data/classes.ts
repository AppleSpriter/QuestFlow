export type ClassName = "Wizard" | "Fighter" | "Rogue" | "Bard" | "Cleric" | "Paladin" | "Ranger" | "Druid" | "Warlock" | "Sorcerer" | "Monk" | "Barbarian";

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
  fatigue: number; // 0~100
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
  hexColor: string;
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
    hexColor: "#7c3aed",
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
    hexColor: "#b91c1c",
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
    hexColor: "#334155",
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
    hexColor: "#b45309",
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
    hexColor: "#0369a1",
    scrollName: "神恩卷轴",
    checkSkills: ["宗教", "医疗", "洞察", "说服"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "知识整理"
  },
  Paladin: {
    emoji: "🛡️",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    hexColor: "#a16207",
    scrollName: "誓言卷轴",
    checkSkills: ["宗教", "说服", "威吓", "洞察"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "守护承诺"
  },
  Ranger: {
    emoji: "🏹",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    hexColor: "#047857",
    scrollName: "狩猎卷轴",
    checkSkills: ["生存", "自然", "察觉", "隐匿"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "自驱追踪"
  },
  Druid: {
    emoji: "🌿",
    color: "text-lime-700",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-300",
    hexColor: "#4d7c0f",
    scrollName: "自然卷轴",
    checkSkills: ["自然", "医疗", "动物驯养", "洞察"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "生态平衡"
  },
  Warlock: {
    emoji: "🕯️",
    color: "text-fuchsia-700",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-300",
    hexColor: "#a21caf",
    scrollName: "契约卷轴",
    checkSkills: ["奥术", "欺瞒", "威吓", "宗教"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "契约协作"
  },
  Sorcerer: {
    emoji: "🌀",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    hexColor: "#c2410c",
    scrollName: "血脉卷轴",
    checkSkills: ["奥术", "说服", "洞察", "威吓"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "天赋直觉"
  },
  Monk: {
    emoji: "🥋",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
    hexColor: "#0f766e",
    scrollName: "气脉卷轴",
    checkSkills: ["运动", "察觉", "洞察", "杂技"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "自律修炼"
  },
  Barbarian: {
    emoji: "🪓",
    color: "text-stone-700",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-300",
    hexColor: "#57534e",
    scrollName: "狂怒卷轴",
    checkSkills: ["运动", "威吓", "生存", "察觉"],
    tierLabels: ["戏法", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"],
    label: "全力突破"
  }
};

export const ALL_CLASSES: ClassName[] = ["Wizard", "Fighter", "Rogue", "Bard", "Cleric", "Paladin", "Ranger", "Druid", "Warlock", "Sorcerer", "Monk", "Barbarian"];

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

  // ── Paladin ──
  { id: "paladin-smite", name: "神圣打击系", class: "Paladin", emoji: "⚡",
    skills: ["神圣打击", "灼热打击", "雷鸣打击", "烙印打击", "放逐打击", "神圣惩戒", "天界审判", "圣光裁决", "神罚降临"] },
  { id: "paladin-oath", name: "誓言系", class: "Paladin", emoji: "📜",
    skills: ["神圣感知", "奉献誓言", "复仇誓言", "古贤誓言", "神圣庇护", "信仰光环", "圣洁誓约", "不灭誓言", "神圣化身"] },
  { id: "paladin-aura", name: "光环系", class: "Paladin", emoji: "🌟",
    skills: ["勇气光环", "守护光环", "献身光环", "生命光环", "纯净光环", "神圣光环", "审判光环", "天界光环", "永恒圣域"] },
  { id: "paladin-heal", name: "治疗系", class: "Paladin", emoji: "💚",
    skills: ["圣疗", "治疗术", "次级复原术", "驱散魔法", "高等复原术", "群体治疗术", "再生术", "圣灵治疗", "完全复苏"] },
  { id: "paladin-mount", name: "召唤坐骑系", class: "Paladin", emoji: "🐎",
    skills: ["召唤坐骑", "强化坐骑", "幻影战马", "天界坐骑", "神圣战马", "飞翼坐骑", "星界坐骑", "审判战骑", "神圣军团"] },

  // ── Ranger ──
  { id: "ranger-mark", name: "猎人印记系", class: "Ranger", emoji: "🎯",
    skills: ["猎人印记", "强化印记", "巨像杀手", "破敌印记", "追踪猎杀", "群体标记", "天敌锁定", "终极猎杀", "神射审判"] },
  { id: "ranger-arrow", name: "箭术系", class: "Ranger", emoji: "🏹",
    skills: ["荆棘箭雨", "强化箭术", "闪电箭", "多重射击", "迅捷箭雨", "风暴箭幕", "星界箭矢", "穿界箭", "万箭齐发"] },
  { id: "ranger-trap", name: "陷阱系", class: "Ranger", emoji: "🪤",
    skills: ["诱捕打击", "荆棘缠绕", "警戒陷阱", "束缚陷阱", "大地牢笼", "猎场封锁", "自然囚笼", "世界根须", "终焉陷阱"] },
  { id: "ranger-beast", name: "野兽系", class: "Ranger", emoji: "🐺",
    skills: ["动物交谈", "野兽伙伴", "强化伙伴", "召唤野兽", "群兽协同", "野性盟约", "远古兽魂", "荒野军团", "万兽之王"] },
  { id: "ranger-survival", name: "生存系", class: "Ranger", emoji: "🌲",
    skills: ["长足大步", "无踪步", "水上行走", "自由行动", "树跃术", "寻路术", "自然庇护", "荒野化身", "世界漫游者"] },

  // ── Druid ──
  { id: "druid-wildshape", name: "野性变身系", class: "Druid", emoji: "🐻",
    skills: ["野性变身", "强化变身", "深境洛斯兽", "枭熊形态", "元素变身", "巨兽形态", "远古兽形", "泰坦形态", "自然化身"] },
  { id: "druid-plant", name: "植物系", class: "Druid", emoji: "🌱",
    skills: ["缠绕术", "荆棘生长", "植物滋长", "自然守卫", "树人觉醒", "荆棘屏障", "森林苏生", "世界树根", "自然支配"] },
  { id: "druid-moon", name: "月亮系", class: "Druid", emoji: "🌙",
    skills: ["月光术", "月华庇护", "月之光束", "月影步", "月之召唤", "月蚀术", "银月审判", "满月化身", "月神降临"] },
  { id: "druid-element", name: "元素系", class: "Druid", emoji: "🌩️",
    skills: ["雷鸣波", "烈焰刀", "召雷术", "冰风暴", "火焰风暴", "石墙术", "风暴复仇", "地震术", "元素灾变"] },
  { id: "druid-heal", name: "治愈系", class: "Druid", emoji: "💚",
    skills: ["治疗真言", "治疗术", "次级复原术", "群体治疗术", "高等复原术", "治愈术", "再生术", "群体再生", "自然复苏"] },

  // ── Warlock ──
  { id: "warlock-blast", name: "魔能爆系", class: "Warlock", emoji: "🕯️",
    skills: ["魔能爆", "苦痛魔能爆", "推斥魔能爆", "强化魔能爆", "虚空爆裂", "深渊射线", "星界魔能", "旧日凝视", "终末魔能"] },
  { id: "warlock-pact", name: "契约系", class: "Warlock", emoji: "🤝",
    skills: ["契约恩赐", "链之契约", "刃之契约", "书之契约", "深化契约", "异界盟约", "远古契约", "永恒契约", "旧日支配"] },
  { id: "warlock-curse", name: "诅咒系", class: "Warlock", emoji: "🩸",
    skills: ["巫术诅咒", "厄运术", "吸血鬼之触", "恐惧术", "支配人类", "灵魂囚笼", "死亡宣告", "支配怪物", "终极诅咒"] },
  { id: "warlock-darkness", name: "黑暗系", class: "Warlock", emoji: "🌑",
    skills: ["黑暗术", "魔鬼视界", "阴影护甲", "影界步", "饥渴黑暗", "暗影召唤", "虚空之门", "深渊降临", "永夜领域"] },
  { id: "warlock-summon", name: "召唤系", class: "Warlock", emoji: "👁️",
    skills: ["魔宠召唤", "迷踪仆役", "恶魔召唤", "次级异界盟友", "异界召唤", "深渊仆从", "旧日化身", "邪神使徒", "远古支配者"] },

  // ── Sorcerer ──
  { id: "sorcerer-fire", name: "火焰血脉系", class: "Sorcerer", emoji: "🔥",
    skills: ["火焰箭", "燃烧之手", "灼热射线", "火球术", "火墙术", "焰击术", "延迟爆裂火球", "焚云术", "流星爆"] },
  { id: "sorcerer-storm", name: "风暴血脉系", class: "Sorcerer", emoji: "⛈️",
    skills: ["雷鸣波", "闪电束", "召雷术", "风暴球", "连锁闪电", "风行术", "风暴复仇", "天灾雷云", "雷霆化身"] },
  { id: "sorcerer-dragon", name: "龙脉系", class: "Sorcerer", emoji: "🐉",
    skills: ["龙息术", "龙鳞护体", "龙威压迫", "龙翼展开", "龙焰爆发", "龙魂觉醒", "远古龙力", "真龙化身", "龙神降临"] },
  { id: "sorcerer-metamagic", name: "超魔系", class: "Sorcerer", emoji: "✨",
    skills: ["超魔塑法", "延展法术", "双发法术", "强效法术", "高等超魔", "快速施法", "精准塑能", "奥术爆发", "魔力洪流"] },
  { id: "sorcerer-chaos", name: "混沌系", class: "Sorcerer", emoji: "🎲",
    skills: ["混沌箭", "幸运扭曲", "野性魔法", "混乱术", "随机传送", "魔力爆涌", "命运逆转", "现实扭曲", "混沌化身"] },

  // ── Monk ──
  { id: "monk-qi", name: "气功系", class: "Monk", emoji: "🌀",
    skills: ["气", "疾风连击", "飞檐走壁", "震慑拳", "金刚魂", "空灵体", "完美自我", "超凡入圣", "天人合一"] },
  { id: "monk-combo", name: "连击系", class: "Monk", emoji: "👊",
    skills: ["徒手打击", "疾风连打", "震慑连击", "破防打击", "金刚连击", "神速拳", "千拳乱舞", "无影拳", "万象归一"] },
  { id: "monk-dodge", name: "闪避系", class: "Monk", emoji: "💨",
    skills: ["灵巧闪避", "偏斜飞弹", "慢落术", "闪避本能", "空灵闪避", "相位闪避", "不动明王", "命运回避", "完全无我"] },
  { id: "monk-movement", name: "身法系", class: "Monk", emoji: "🦶",
    skills: ["踏风步", "轻身术", "水上步", "壁走术", "瞬身步", "空行术", "维度步", "无距步", "神行无踪"] },
  { id: "monk-mind", name: "心灵系", class: "Monk", emoji: "🧘",
    skills: ["静心", "净化身心", "宁静术", "心灵护盾", "空性冥想", "真我觉醒", "灵魂坚韧", "超脱轮回", "涅槃"] },

  // ── Barbarian ──
  { id: "barbarian-rage", name: "狂怒系", class: "Barbarian", emoji: "🪓",
    skills: ["狂怒", "强化狂怒", "鲁莽攻击", "狂暴打击", "无尽狂怒", "原始怒火", "泰坦狂怒", "灭世狂怒", "战神化身"] },
  { id: "barbarian-totem", name: "图腾系", class: "Barbarian", emoji: "🐻",
    skills: ["野性本能", "熊之图腾", "鹰之图腾", "狼之图腾", "灵魂行者", "图腾守护", "远古兽魂", "荒野化身", "万灵之王"] },
  { id: "barbarian-throw", name: "投掷系", class: "Barbarian", emoji: "🪨",
    skills: ["投掷", "强力投掷", "狂暴投掷", "巨力投掷", "破甲投掷", "山崩投掷", "陨星投掷", "泰坦掷击", "世界投掷"] },
  { id: "barbarian-tough", name: "坚韧系", class: "Barbarian", emoji: "🛡️",
    skills: ["无甲防御", "危险感知", "坚韧体魄", "伤害抗性", "不屈狂暴", "原始韧性", "不灭肉身", "泰坦之躯", "永恒战体"] },
  { id: "barbarian-shatter", name: "震慑系", class: "Barbarian", emoji: "💥",
    skills: ["威吓怒吼", "震地猛击", "破胆怒吼", "雷霆践踏", "战争咆哮", "山岳崩裂", "大地震怒", "末日咆哮", "原初毁灭"] }
];

// ─── Fatigue system ──────────────────────────────────────────────

export type FatigueStage = "energized" | "light" | "tired" | "exhausted";

export function getFatigueStage(fatigue: number): FatigueStage {
  if (fatigue <= 30) return "energized";
  if (fatigue <= 60) return "light";
  if (fatigue <= 80) return "tired";
  return "exhausted";
}

export function getFatigueMultiplier(fatigue: number): number {
  if (fatigue <= 30) return 1.0;
  if (fatigue <= 60) return 0.9;
  if (fatigue <= 80) return 0.75;
  return 0.5;
}

export const FATIGUE_STAGE_META: Record<FatigueStage, { label: string; emoji: string; color: string }> = {
  energized: { label: "精力充沛", emoji: "🟢", color: "#10b981" },
  light:     { label: "轻度疲劳", emoji: "🟡", color: "#eab308" },
  tired:     { label: "疲劳", emoji: "🟠", color: "#f97316" },
  exhausted: { label: "极度疲劳", emoji: "🔴", color: "#ef4444" }
};

export const FATIGUE_PER_PROGRESS = 5;
export const SHORT_REST_MINUTES = 5;
export const LONG_REST_MINUTES = 15;
export const SHORT_REST_RECOVERY = 30; // -30% fatigue

// ─── Task tags ────────────────────────────────────────────────

export type TaskTag = "important" | "urgent";

export function getTagBonus(tags: TaskTag[]): number {
  const hasImportant = tags.includes("important");
  const hasUrgent = tags.includes("urgent");
  if (hasImportant && hasUrgent) return 5;
  if (hasImportant) return 3;
  if (hasUrgent) return 2;
  return 0;
}

export const TAG_META: Record<TaskTag, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  important: { label: "重要", textColor: "#1d4ed8", bgColor: "#dbeafe", borderColor: "#93c5fd" },
  urgent:    { label: "紧急", textColor: "#b91c1c", bgColor: "#fee2e2", borderColor: "#fca5a5" }
};

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

function getScrollRewardCount(classLevel: number, success: boolean, critical: boolean): {
  scrollCount: number;
  bonusScrollChance: number;
} {
  if (!success) {
    return { scrollCount: 0, bonusScrollChance: 0 };
  }

  if (critical) {
    // 大成功：双倍卷轴
    return { scrollCount: 2, bonusScrollChance: 100 };
  }

  // 普通成功：1 个卷轴
  return { scrollCount: 1, bonusScrollChance: 0 };
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

export function rollSkillCheck(
  className: ClassName,
  classLevel: number,
  options?: { forceAdvantage?: boolean; criticalBonusChance?: number }
): SkillCheckResult {
  const meta = CLASS_META[className];
  const skillName = meta.checkSkills[Math.floor(Math.random() * meta.checkSkills.length)];
  const dc = 10 + Math.floor(Math.random() * 6);
  const { roll, naturalRolls, advantageTriggered } = options?.forceAdvantage
    ? (() => {
        const first = Math.floor(Math.random() * 20) + 1;
        const second = Math.floor(Math.random() * 20) + 1;
        return { roll: Math.max(first, second), naturalRolls: [first, second], advantageTriggered: true };
      })()
    : rollWeightedD20(classLevel);
  const modifier = Math.floor(classLevel / 2);
  const total = roll + modifier;
  const critical = roll === 20 || Math.random() < (options?.criticalBonusChance ?? 0);
  const success = critical || total >= dc;
  const xpBonus = critical ? 10 : success ? 5 : 0;
  const scrollEarned = success;
  const { scrollCount, bonusScrollChance } = getScrollRewardCount(classLevel, success, critical);

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
  return Object.fromEntries(
    ALL_CLASSES.map((cn) => [cn, { xp: 0, scrolls: 0, skills: [], fatigue: 0 }])
  ) as unknown as Record<ClassName, ClassState>;
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
  { id: "trail", name: "冒险小径", emoji: "🥾", minProgress: 5, maxProgress: 9 },
  { id: "forest", name: "灵感森林", emoji: "🌲", minProgress: 10, maxProgress: 19 },
  { id: "ruins", name: "古代遗迹", emoji: "🏛️", minProgress: 20, maxProgress: 34 },
  { id: "canyon", name: "深度峡谷", emoji: "🏔️", minProgress: 35, maxProgress: 49 },
  { id: "swamp", name: "迷雾沼泽", emoji: "🌫️", minProgress: 50, maxProgress: 69 },
  { id: "tower", name: "架构高塔", emoji: "🗼", minProgress: 70, maxProgress: 89 },
  { id: "library", name: "秘法图书馆", emoji: "📚", minProgress: 90, maxProgress: 119 },
  { id: "forge", name: "星火熔炉", emoji: "🔥", minProgress: 120, maxProgress: 149 },
  { id: "citadel", name: "晨星城塞", emoji: "🏰", minProgress: 150, maxProgress: 199 },
  { id: "abyss", name: "回声深渊", emoji: "🕳️", minProgress: 200, maxProgress: 249 },
  { id: "astral", name: "星界航道", emoji: "🌌", minProgress: 250, maxProgress: 349 },
  { id: "lab", name: "星辰实验室", emoji: "🧪", minProgress: 350, maxProgress: 499 },
  { id: "throne", name: "命运王座", emoji: "👑", minProgress: 500, maxProgress: 749 },
  { id: "legend", name: "传奇之门", emoji: "🌠", minProgress: 750, maxProgress: Infinity }
];

export function getMapRegion(progressCount: number): MapRegion {
  return MAP_REGIONS.find((r) => progressCount >= r.minProgress && progressCount <= r.maxProgress) ?? MAP_REGIONS[0];
}
