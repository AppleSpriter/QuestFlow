import {
  type ClassName,
  type SkillCheckResult,
  type TaskTag,
} from "@/data/classes";
import type {
  DiscoveredResonance,
  ResonanceBuffs,
  ResonanceChainState,
  ResonanceTrigger,
} from "@/data/resonance";
import type { FeatState } from "@/data/feats";

export type QuestStatus = "active" | "paused" | "archived";
export type ProgressLogType = "progress" | "scroll";
export type RecurringTaskFrequency = "daily" | "weekly";
export type ProgressTagColorId = "blue" | "emerald" | "violet" | "amber" | "rose" | "sky" | "slate" | "fuchsia" | "cyan" | "lime" | "orange" | "indigo" | "pink";

export type ProgressTagColorMeta = {
  id: ProgressTagColorId;
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
};

export type ProgressTag = {
  id: string;
  name: string;
  colorId: ProgressTagColorId;
  createdAt: string;
  updatedAt: string;
};

export type ProgressTagSnapshot = {
  id: string;
  name: string;
  colorId: ProgressTagColorId;
};

export type QuestTodoItem = {
  id: string;
  title: string;
  completedAt?: string;
  createdAt: string;
};

export type QuestTask = {
  id: string;
  title: string;
  progressCount: number;
  status: QuestStatus;
  className: ClassName;
  tags: TaskTag[];
  todos: QuestTodoItem[];
  recurringCompletedAt?: string;
  recurringCompletedKey?: string;
  createdAt: string;
  updatedAt: string;
  lastFocusedAt?: string;
};

export type ProgressLog = {
  id: string;
  type: ProgressLogType;
  taskId: string;
  className: ClassName;
  note: string;
  at: string;
  xpAwarded: number;
  classXpAwarded: number;
  progressCount: number;
  skillCheck?: SkillCheckResult;
  scrollEarned?: string;
  scrollCount?: number;
  newSkill?: string;
  skillUpgrade?: { name: string; fromTier: number; toTier: number; className: ClassName };
  fatigueBefore?: number;
  fatigueAfter?: number;
  synergyBonus?: boolean;
  resonanceKey?: string;
  resonanceName?: string;
  resonanceReward?: string;
  todoId?: string;
  todoTitle?: string;
  progressTags?: ProgressTagSnapshot[];
};

export type ProgressResult = {
  taskId: string;
  taskTitle: string;
  className: ClassName;
  progressCount: number;
  xpAwarded: number;
  classXpAwarded: number;
  momentum: number;
  milestone?: number;
  newRegion?: string;
  streak: number;
  firstOfDay: boolean;
  skillCheck?: SkillCheckResult;
  scrollEarned?: string;
  scrollCount?: number;
  newSkill?: string;
  skillUpgrade?: { name: string; fromTier: number; toTier: number; className: ClassName };
  fatigueBefore?: number;
  fatigueAfter?: number;
  synergyBonus?: boolean;
  resonance?: ResonanceTrigger;
  at: string;
};

export type StreakState = {
  count: number;
  lastProgressDate?: string;
};

export type RestState = {
  type: "short" | "long";
  startedAt: string;
  endsAt: string;
};

export type LongRestSummary = {
  date: string;
  classSummaries: Record<ClassName, {
    progressCount: number;
    xpGained: number;
    scrollsEarned: number;
    skillEvents: string[];
  }>;
  totalXp: number;
  totalScrolls: number;
  streak: number;
};

export type QuestBackup = {
  app: "questflow";
  version: number;
  exportedAt: string;
  updatedAt: string;
  tasks: QuestTask[];
  logs: ProgressLog[];
  focusTaskId?: string;
  totalXp: number;
  streak: StreakState;
  momentumTaskId?: string;
  momentumCount: number;
  classStates: Record<ClassName, { xp: number; scrolls: number; skills: { lineId: string; copies: number; currentTier: number }[]; fatigue: number }>;
  lastProgressDate?: string;
  lastSyncedAt?: string;
  lastProgressClass?: ClassName;
  discoveredResonances?: Record<string, DiscoveredResonance>;
  resonanceBuffs?: ResonanceBuffs;
  resonanceChain?: ResonanceChainState;
  featState?: FeatState;
  progressTags?: ProgressTag[];
};

export type ProgressTaskOptions = {
  note?: string;
  todo?: QuestTodoItem;
  progressTagIds?: string[];
};
