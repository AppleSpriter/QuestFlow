import type { ClassName, ClassState, OwnedSkill } from "./classes";
import { ALL_CLASSES, getClassLevel, SKILL_LINES } from "./classes";
import type { DiscoveredResonance } from "./resonance";
import { getResonanceKey } from "./resonance";

export type FeatFlow = "learning" | "focus" | "luck" | "resonance" | "collection" | "rest";
export type FeatQuality = "common" | "rare" | "epic" | "legendary";

export type FeatDefinition = {
  id: string;
  name: string;
  flow: FeatFlow;
  quality: FeatQuality;
  emoji: string;
  summary: string;
  detail: string;
  recommendedClasses?: ClassName[];
};

export type OwnedFeat = {
  id: string;
  className: ClassName;
  selectedAt: string;
  level: number;
};

export type PendingFeatChoice = {
  id: string;
  className: ClassName;
  pointIndex: number;
  level: number;
  choices: string[];
  createdAt: string;
};

export type FeatState = {
  owned: OwnedFeat[];
  pending: PendingFeatChoice[];
  dailyAdvantageUsedAt?: string;
  shortRestCount: number;
  longRestCount: number;
};

export type BuildDefinition = {
  id: string;
  name: string;
  emoji: string;
  summary: string;
  effect: string;
};

export type BuildSummary = BuildDefinition & {
  rating: string;
  score: number;
  reasons: string[];
};

export type BuildContext = {
  classStates: Record<ClassName, ClassState>;
  featState: FeatState;
  discoveredResonances: Record<string, DiscoveredResonance>;
};

export const FEAT_FLOW_META: Record<FeatFlow, { label: string; emoji: string; color: string }> = {
  learning: { label: "学习流", emoji: "📚", color: "#7c3aed" },
  focus: { label: "专注流", emoji: "🎯", color: "#b91c1c" },
  luck: { label: "幸运流", emoji: "🎲", color: "#16a34a" },
  resonance: { label: "共鸣流", emoji: "✨", color: "#9333ea" },
  collection: { label: "收集流", emoji: "📜", color: "#d97706" },
  rest: { label: "休息流", emoji: "🏕️", color: "#0f766e" }
};

export const FEAT_QUALITY_META: Record<FeatQuality, { label: string; emoji: string; color: string; weight: number }> = {
  common: { label: "普通", emoji: "🟢", color: "#16a34a", weight: 1 },
  rare: { label: "稀有", emoji: "🔵", color: "#2563eb", weight: 2 },
  epic: { label: "史诗", emoji: "🟣", color: "#9333ea", weight: 3 },
  legendary: { label: "传奇", emoji: "🟠", color: "#ea580c", weight: 5 }
};

export const FEAT_DEFINITIONS: FeatDefinition[] = [
  { id: "diligent-scholar", name: "勤学者", flow: "learning", quality: "common", emoji: "📘", summary: "所有 XP +1", detail: "每次 Progress 的总 XP 与职业 XP 都额外 +1。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "deep-thinking", name: "深度思考", flow: "learning", quality: "common", emoji: "🧠", summary: "重要任务额外 +2 XP", detail: "带有重要标签的任务额外获得 +2 XP。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "eidetic-memory", name: "博闻强记", flow: "learning", quality: "rare", emoji: "🧾", summary: "卷轴获得率 +10%", detail: "成功检定后有额外概率多获得 1 个卷轴。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "rapid-learning", name: "快速学习", flow: "learning", quality: "rare", emoji: "⚡", summary: "新职业前 10 次 Progress XP +50%", detail: "每个职业的前 10 次 Progress 获得额外成长加成。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "school-master", name: "学派大师", flow: "learning", quality: "epic", emoji: "🏛️", summary: "单职业 Lv20 后该职业 XP +20%", detail: "当当前职业达到 Lv20 后，该职业 XP 额外 +20%。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "grand-library", name: "万卷书库", flow: "learning", quality: "legendary", emoji: "📚", summary: "所有职业 XP +10%", detail: "所有职业获得持续的职业 XP 增幅。", recommendedClasses: ["Wizard", "Druid", "Bard"] },
  { id: "specialist", name: "专家", flow: "focus", quality: "common", emoji: "🎯", summary: "同任务连续推进 3 次额外 +3 XP", detail: "同一个任务形成 3 连续推进后获得额外 XP。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "long-hauler", name: "长线主义者", flow: "focus", quality: "common", emoji: "🛤️", summary: "重要任务额外 +1 卷轴", detail: "重要任务成功推进时额外获得卷轴。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "deep-work", name: "深度工作", flow: "focus", quality: "rare", emoji: "🕯️", summary: "Focus 状态 Fatigue 增长减半", detail: "当前专注任务推进时，疲劳增长减半。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "target-lock", name: "目标锁定", flow: "focus", quality: "rare", emoji: "🔒", summary: "连续推进同任务时 XP 递增", detail: "同任务连续推进时按连击数获得额外 XP。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "iron-will", name: "坚定意志", flow: "focus", quality: "epic", emoji: "🛡️", summary: "Fatigue > 80 仍获得 100% XP", detail: "极度疲劳时不会降低 XP 收益。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "legendary-crafter", name: "传奇工匠", flow: "focus", quality: "legendary", emoji: "⚒️", summary: "同任务连续推进 10 次额外获得卷轴", detail: "长线连续推进到 10 连击时额外获得卷轴。", recommendedClasses: ["Fighter", "Paladin", "Monk"] },
  { id: "lucky-one", name: "幸运儿", flow: "luck", quality: "common", emoji: "🍀", summary: "大成功率 +3%", detail: "每次检定都有额外大成功概率。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "favored-by-fate", name: "命运眷顾", flow: "luck", quality: "common", emoji: "🌟", summary: "失败时 10% 概率重投", detail: "失败检定有概率转化为一次命运重投。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "golden-hand", name: "黄金手气", flow: "luck", quality: "rare", emoji: "🪙", summary: "卷轴双倍概率 +10%", detail: "获得卷轴时有额外概率再获得 1 个。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "fate-dice", name: "命运骰子", flow: "luck", quality: "rare", emoji: "🎲", summary: "每日第一次检定获得优势", detail: "每天第一次触发技能检定时自动获得 Advantage。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "chosen-one", name: "天选之人", flow: "luck", quality: "epic", emoji: "👁️", summary: "所有检定 +1", detail: "所有技能检定结果额外 +1。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "fate-weaver", name: "命运编织者", flow: "luck", quality: "legendary", emoji: "🕸️", summary: "大成功奖励翻倍", detail: "大成功获得的 XP 与卷轴奖励翻倍。", recommendedClasses: ["Rogue", "Sorcerer", "Warlock"] },
  { id: "social-adept", name: "社交达人", flow: "resonance", quality: "common", emoji: "🤝", summary: "共鸣触发额外 +1 XP", detail: "职业共鸣触发时额外获得总 XP +1。" },
  { id: "class-switcher", name: "职业切换者", flow: "resonance", quality: "common", emoji: "🔁", summary: "切换职业额外 +3 XP", detail: "跨职业推进时额外获得 XP。" },
  { id: "resonance-master", name: "共鸣大师", flow: "resonance", quality: "rare", emoji: "💫", summary: "首次解锁共鸣额外奖励", detail: "首次发现新共鸣时额外获得卷轴。" },
  { id: "linkage-expert", name: "联动专家", flow: "resonance", quality: "rare", emoji: "🔗", summary: "共鸣触发后 10% 概率再次触发", detail: "普通共鸣触发时有概率重复一次直接奖励。" },
  { id: "party-coordinator", name: "队伍协调者", flow: "resonance", quality: "epic", emoji: "🧭", summary: "连续不同职业推进 Fatigue -5", detail: "跨职业连续推进后降低当前职业疲劳。" },
  { id: "resonance-core", name: "共鸣核心", flow: "resonance", quality: "legendary", emoji: "🌀", summary: "所有共鸣奖励翻倍", detail: "职业共鸣的直接奖励翻倍。" },
  { id: "collector", name: "收藏家", flow: "collection", quality: "common", emoji: "🧺", summary: "首次获得技能额外 XP", detail: "每次首次习得技能系时获得额外职业 XP。" },
  { id: "codex-hunter", name: "图鉴猎人", flow: "collection", quality: "common", emoji: "🔎", summary: "首次解锁技能系额外卷轴", detail: "首次解锁技能系时返还额外卷轴。" },
  { id: "skill-fanatic", name: "技能狂热", flow: "collection", quality: "rare", emoji: "🔥", summary: "技能升环奖励提高", detail: "技能升环时额外获得职业 XP。" },
  { id: "treasure-hunter", name: "宝藏猎人", flow: "collection", quality: "rare", emoji: "💎", summary: "高环卷轴出现率提高", detail: "使用卷轴强化高环技能时更容易继续积累卷轴。" },
  { id: "archaeologist", name: "考古学家", flow: "collection", quality: "epic", emoji: "🏺", summary: "首次进入新地图区域获得卷轴", detail: "任务首次进入新地图区域时额外获得卷轴。" },
  { id: "omnicollector", name: "万象收藏家", flow: "collection", quality: "legendary", emoji: "👑", summary: "所有首次发现奖励翻倍", detail: "首次发现类奖励获得翻倍。" },
  { id: "nap", name: "小憩", flow: "rest", quality: "common", emoji: "☕", summary: "短休恢复 +10%", detail: "短休恢复更多疲劳。" },
  { id: "self-recovery", name: "自我恢复", flow: "rest", quality: "common", emoji: "🌱", summary: "每日首次 Progress 恢复 5 Fatigue", detail: "每天第一次 Progress 时当前职业疲劳 -5。" },
  { id: "deep-sleep", name: "深度睡眠", flow: "rest", quality: "rare", emoji: "🌙", summary: "长休额外获得卷轴", detail: "长休结束时最后推进职业额外获得卷轴。" },
  { id: "meditator", name: "冥想者", flow: "rest", quality: "rare", emoji: "🧘", summary: "休息结束获得 XP", detail: "休息结束时最后推进职业获得职业 XP。" },
  { id: "energy-manager", name: "精力管理", flow: "rest", quality: "epic", emoji: "🔋", summary: "Fatigue 上限 +20", detail: "职业疲劳上限提升到 120。" },
  { id: "perpetual-motion", name: "永动机", flow: "rest", quality: "legendary", emoji: "♾️", summary: "Fatigue 永远不会超过 80", detail: "疲劳会被限制在 80 以内。" }
];

export const FEAT_MAP = Object.fromEntries(FEAT_DEFINITIONS.map((feat) => [feat.id, feat])) as Record<string, FeatDefinition>;

export const BUILD_DEFINITIONS: Record<string, BuildDefinition> = {
  fateWeaver: { id: "fateWeaver", name: "命运编织者", emoji: "🎲", summary: "高检定 / 高爆发 / 高卷轴", effect: "幸运流专长 ≥ 3" },
  polymath: { id: "polymath", name: "博学者", emoji: "📚", summary: "高速成长", effect: "学习流专长 ≥ 3 且 Wizard XP 最高" },
  executionMaster: { id: "executionMaster", name: "执行大师", emoji: "⚔️", summary: "长线推进", effect: "专注流专长 ≥ 3 且 Fighter XP 最高" },
  resonanceMaster: { id: "resonanceMaster", name: "共鸣大师", emoji: "✨", summary: "职业组合专家", effect: "共鸣流专长 ≥ 3 且解锁共鸣 ≥ 20" },
  collectionGrandmaster: { id: "collectionGrandmaster", name: "收藏宗师", emoji: "📜", summary: "卷轴收集专家", effect: "收集流专长 ≥ 3 且技能图鉴完成率 ≥ 50%" },
  wildTraveler: { id: "wildTraveler", name: "荒野旅者", emoji: "🏕️", summary: "资源管理专家", effect: "休息流专长 ≥ 3 且短休次数 ≥ 50" },
  spellblade: { id: "spellblade", name: "Spellblade", emoji: "🔥", summary: "魔武双修", effect: "Wizard + Fighter 共鸣次数 ≥ 20" },
  arcaneTrickster: { id: "arcaneTrickster", name: "奥术诡术师", emoji: "🌑", summary: "高机动 Build", effect: "Wizard + Rogue 共鸣次数 ≥ 20" },
  agentArchitect: { id: "agentArchitect", name: "Agent Architect", emoji: "👑", summary: "全能型成长路线", effect: "Wizard / Fighter / Rogue XP 均 ≥ 1000" }
};

export const createInitialFeatState = (): FeatState => ({
  owned: [],
  pending: [],
  shortRestCount: 0,
  longRestCount: 0
});

export function getFeatPointsForLevel(level: number): number {
  return Math.max(0, Math.floor(level / 4));
}

export function getFeatPointsForXp(xp: number): number {
  return getFeatPointsForLevel(getClassLevel(xp));
}

export function getOwnedFeatsForClass(featState: FeatState, className: ClassName): OwnedFeat[] {
  return featState.owned.filter((feat) => feat.className === className && FEAT_MAP[feat.id]);
}

export function hasFeat(featState: FeatState, featId: string, className?: ClassName): boolean {
  return featState.owned.some((feat) => feat.id === featId && (!className || feat.className === className));
}

export function countFeatsByFlow(featState: FeatState, flow: FeatFlow, className?: ClassName): number {
  return featState.owned.filter((owned) => {
    const definition = FEAT_MAP[owned.id];
    return definition?.flow === flow && (!className || owned.className === className);
  }).length;
}

export function getPrimaryFeatFlow(featState: FeatState, className: ClassName): FeatFlow | undefined {
  const counts = Object.keys(FEAT_FLOW_META).map((flow) => ({
    flow: flow as FeatFlow,
    count: countFeatsByFlow(featState, flow as FeatFlow, className)
  }));
  return counts.sort((a, b) => b.count - a.count)[0]?.count ? counts[0].flow : undefined;
}

export function getNextFeatLevel(className: ClassName, classStates: Record<ClassName, ClassState>, featState: FeatState): number | undefined {
  const level = getClassLevel(classStates[className].xp);
  const owned = getOwnedFeatsForClass(featState, className).length;
  const pending = featState.pending.filter((choice) => choice.className === className).length;
  const nextPointIndex = owned + pending + 1;
  const nextLevel = nextPointIndex * 4;
  return nextLevel > level ? nextLevel : undefined;
}

function hashSeed(value: string): number {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function createFeatChoice(
  className: ClassName,
  pointIndex: number,
  level: number,
  selectedIds: Set<string>,
  now: string
): PendingFeatChoice {
  const available = FEAT_DEFINITIONS.filter((feat) => !selectedIds.has(feat.id));
  const seed = hashSeed(`${className}-${pointIndex}-${level}`);
  const weighted = available
    .map((feat, index) => ({
      feat,
      score:
        ((index + 1) * 37 + seed + FEAT_QUALITY_META[feat.quality].weight * 11 + (feat.recommendedClasses?.includes(className) ? 23 : 0)) % 101
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.feat.id);

  return {
    id: `${className}-feat-${pointIndex}`,
    className,
    pointIndex,
    level,
    choices: weighted.slice(0, 3),
    createdAt: now
  };
}

export function refreshPendingFeatChoices(
  classStates: Record<ClassName, ClassState>,
  featState: FeatState,
  now: string
): FeatState {
  const pending = [...featState.pending];
  const selectedIds = new Set(featState.owned.map((feat) => feat.id));

  for (const className of ALL_CLASSES) {
    const totalPoints = getFeatPointsForXp(classStates[className].xp);
    const ownedCount = featState.owned.filter((feat) => feat.className === className).length;
    const pendingForClass = pending.filter((choice) => choice.className === className);

    for (let pointIndex = ownedCount + pendingForClass.length + 1; pointIndex <= totalPoints; pointIndex++) {
      pending.push(createFeatChoice(className, pointIndex, pointIndex * 4, selectedIds, now));
    }
  }

  return { ...featState, pending };
}

function getTopXpClass(classStates: Record<ClassName, ClassState>): ClassName {
  return ALL_CLASSES.reduce((top, className) => classStates[className].xp > classStates[top].xp ? className : top, "Wizard");
}

function getSkillCollectionRate(classStates: Record<ClassName, ClassState>): number {
  const ownedLineIds = new Set<string>();
  for (const className of ALL_CLASSES) {
    classStates[className].skills.forEach((skill: OwnedSkill) => ownedLineIds.add(skill.lineId));
  }
  return SKILL_LINES.length === 0 ? 0 : ownedLineIds.size / SKILL_LINES.length;
}

function buildRating(score: number): string {
  if (score >= 90) return "传奇型 Build";
  if (score >= 70) return "成熟型 Build";
  if (score >= 45) return "成长型 Build";
  return "萌芽型 Build";
}

export function getBuildSummaries(context: BuildContext, className?: ClassName): BuildSummary[] {
  const { classStates, featState, discoveredResonances } = context;
  const topXpClass = getTopXpClass(classStates);
  const discoveredCount = Object.keys(discoveredResonances).length;
  const skillCollectionRate = getSkillCollectionRate(classStates);
  const wizardFighter = discoveredResonances[getResonanceKey("Wizard", "Fighter")]?.triggerCount ?? 0;
  const wizardRogue = discoveredResonances[getResonanceKey("Wizard", "Rogue")]?.triggerCount ?? 0;
  const add = (definition: BuildDefinition, score: number, reasons: string[]): BuildSummary => ({
    ...definition,
    score,
    rating: buildRating(score),
    reasons
  });

  const builds: BuildSummary[] = [];
  const targetClasses = className ? [className] : ALL_CLASSES;
  const flowCount = (flow: FeatFlow) => targetClasses.reduce((sum, cn) => sum + countFeatsByFlow(featState, flow, cn), 0);

  if (flowCount("luck") >= 3) builds.push(add(BUILD_DEFINITIONS.fateWeaver, 60 + flowCount("luck") * 10, [`幸运流专长 ${flowCount("luck")} 个`])) ;
  if (flowCount("learning") >= 3 && (!className || className === "Wizard") && topXpClass === "Wizard") builds.push(add(BUILD_DEFINITIONS.polymath, 70 + flowCount("learning") * 8, ["Wizard XP 当前最高", `学习流专长 ${flowCount("learning")} 个`])) ;
  if (flowCount("focus") >= 3 && (!className || className === "Fighter") && topXpClass === "Fighter") builds.push(add(BUILD_DEFINITIONS.executionMaster, 70 + flowCount("focus") * 8, ["Fighter XP 当前最高", `专注流专长 ${flowCount("focus")} 个`])) ;
  if (flowCount("resonance") >= 3 && discoveredCount >= 20) builds.push(add(BUILD_DEFINITIONS.resonanceMaster, 70 + Math.min(30, discoveredCount), [`已解锁共鸣 ${discoveredCount} 个`, `共鸣流专长 ${flowCount("resonance")} 个`])) ;
  if (flowCount("collection") >= 3 && skillCollectionRate >= 0.5) builds.push(add(BUILD_DEFINITIONS.collectionGrandmaster, 70 + Math.round(skillCollectionRate * 30), [`技能图鉴完成率 ${Math.round(skillCollectionRate * 100)}%`, `收集流专长 ${flowCount("collection")} 个`])) ;
  if (flowCount("rest") >= 3 && featState.shortRestCount >= 50) builds.push(add(BUILD_DEFINITIONS.wildTraveler, 70 + Math.min(30, featState.shortRestCount - 50), [`短休 ${featState.shortRestCount} 次`, `休息流专长 ${flowCount("rest")} 个`])) ;
  if ((!className || className === "Wizard" || className === "Fighter") && wizardFighter >= 20) builds.push(add(BUILD_DEFINITIONS.spellblade, 80 + Math.min(20, wizardFighter - 20), [`Wizard + Fighter 共鸣 ${wizardFighter} 次`])) ;
  if ((!className || className === "Wizard" || className === "Rogue") && wizardRogue >= 20) builds.push(add(BUILD_DEFINITIONS.arcaneTrickster, 80 + Math.min(20, wizardRogue - 20), [`Wizard + Rogue 共鸣 ${wizardRogue} 次`])) ;
  if (classStates.Wizard.xp >= 1000 && classStates.Fighter.xp >= 1000 && classStates.Rogue.xp >= 1000) builds.push(add(BUILD_DEFINITIONS.agentArchitect, 95, ["Wizard / Fighter / Rogue XP 均已达到 1000"])) ;

  return builds.sort((a, b) => b.score - a.score);
}
