import {
  type TaskTag,
  type SkillCheckResult,
  FATIGUE_PER_PROGRESS,
  getFatigueMultiplier,
  getMapRegion,
  getTagBonus,
} from '../data/classes';
import type { ResonanceRewardType } from '../data/resonance';

export const milestones = new Set([5, 10, 25, 50]);
export const milestoneXpBonus: Record<number, number> = { 5: 25, 10: 50, 25: 75, 50: 100 };
export const BASE_PROGRESS_XP = 5;
export const BASE_CLASS_XP = 5;
export const MOMENTUM_BONUS_THRESHOLD = 3;
export const MOMENTUM_BONUS_XP = 10;
export const RESONANCE_XP_BONUS = 3;
export const RESONANCE_FATIGUE_RECOVERY = 10;

export type ProgressRewardInput = {
  previousProgressCount: number;
  progressCount: number;
  tags: TaskTag[];
  fatigueBefore: number;
  momentum: number;
  resonanceRewardType?: ResonanceRewardType;
  resonanceChainBonus?: boolean;
  skillCheck?: SkillCheckResult;
  doubleScrollBuffs?: number;
};

export type ProgressRewardResult = {
  tagBonus: number;
  momentumBonus: number;
  milestone?: number;
  milestoneBonus: number;
  resonanceBonusXp: number;
  fatigueMultiplier: number;
  baseXp: number;
  classXpAwarded: number;
  scrollsAwarded: number;
  consumedDoubleScroll: boolean;
  fatigueAfterProgress: number;
  finalFatigueAfter: number;
  newRegion?: string;
};

export function calculateProgressReward(input: ProgressRewardInput): ProgressRewardResult {
  const fatigueMultiplier = getFatigueMultiplier(input.fatigueBefore);
  const tagBonus = getTagBonus(input.tags);
  const momentumBonus = input.momentum >= MOMENTUM_BONUS_THRESHOLD ? MOMENTUM_BONUS_XP : 0;
  const milestone = milestones.has(input.progressCount) ? input.progressCount : undefined;
  const milestoneBonus = milestone ? (milestoneXpBonus[milestone] ?? 50) : 0;
  const resonanceBonusXp = input.resonanceRewardType === 'xp' ? RESONANCE_XP_BONUS : 0;
  const baseXp = Math.round(
    (BASE_PROGRESS_XP + tagBonus + momentumBonus + milestoneBonus + resonanceBonusXp) * fatigueMultiplier
  );

  let classXpAwarded = Math.round(BASE_CLASS_XP * fatigueMultiplier);
  if (input.skillCheck) {
    classXpAwarded += Math.round(input.skillCheck.xpBonus * fatigueMultiplier);
  }

  let scrollsAwarded =
    (input.resonanceRewardType === 'scroll' ? 1 : 0) +
    (input.resonanceChainBonus ? 1 : 0);
  let consumedDoubleScroll = false;

  if (input.skillCheck?.scrollEarned) {
    const doubleScrollBonus = (input.doubleScrollBuffs ?? 0) > 0 ? 1 : 0;
    scrollsAwarded += input.skillCheck.scrollCount + doubleScrollBonus;
    consumedDoubleScroll = doubleScrollBonus > 0;
  }

  const fatigueAfterProgress = Math.min(100, input.fatigueBefore + FATIGUE_PER_PROGRESS);
  const finalFatigueAfter =
    input.resonanceRewardType === 'fatigue'
      ? Math.max(0, fatigueAfterProgress - RESONANCE_FATIGUE_RECOVERY)
      : fatigueAfterProgress;

  const oldRegion = getMapRegion(input.previousProgressCount);
  const newRegionData = getMapRegion(input.progressCount);
  const newRegion = oldRegion.id !== newRegionData.id ? newRegionData.name : undefined;

  return {
    tagBonus,
    momentumBonus,
    milestone,
    milestoneBonus,
    resonanceBonusXp,
    fatigueMultiplier,
    baseXp,
    classXpAwarded,
    scrollsAwarded,
    consumedDoubleScroll,
    fatigueAfterProgress,
    finalFatigueAfter,
    newRegion,
  };
}
