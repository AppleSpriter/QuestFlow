"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type ClassName,
  type ClassState,
  type SkillCheckResult,
  type OwnedSkill,
  type TaskTag,
  ALL_CLASSES,
  initClassState,
  getClassLevel,
  rollSkillCheck,
  learnSkillFromScroll,
  getLineById,
  getSkillNameAtTier,
  getTierFromCopies,
  SKILL_LINES,
  getMapRegion,
  getFatigueMultiplier,
  getTagBonus,
  FATIGUE_PER_PROGRESS,
  SHORT_REST_RECOVERY
} from "@/data/classes";
import {
  type DiscoveredResonance,
  type ResonanceBuffs,
  type ResonanceChainState,
  type ResonanceTrigger,
  RESONANCE_MAP,
  createInitialResonanceBuffs,
  getResonanceKey,
  getResonanceLevel
} from "@/data/resonance";

export type QuestStatus = "active" | "paused" | "archived";

export type QuestTask = {
  id: string;
  title: string;
  progressCount: number;
  status: QuestStatus;
  className: ClassName;
  tags: TaskTag[];
  createdAt: string;
  updatedAt: string;
  lastFocusedAt?: string;
};

export type ProgressLog = {
  id: string;
  taskId: string;
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
};

export type ProgressResult = {
  taskId: string;
  taskTitle: string;
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
  classStates: Record<ClassName, ClassState>;
  lastProgressDate?: string;
  lastSyncedAt?: string;
  lastProgressClass?: ClassName;
  discoveredResonances?: Record<string, DiscoveredResonance>;
  resonanceBuffs?: ResonanceBuffs;
  resonanceChain?: ResonanceChainState;
};

type QuestStore = {
  tasks: QuestTask[];
  logs: ProgressLog[];
  focusTaskId?: string;
  totalXp: number;
  streak: StreakState;
  momentumTaskId?: string;
  momentumCount: number;
  classStates: Record<ClassName, ClassState>;
  lastProgressDate?: string;
  dataUpdatedAt?: string;
  lastSyncedAt?: string;
  lastProgressClass?: ClassName;
  restState?: RestState;
  discoveredResonances: Record<string, DiscoveredResonance>;
  resonanceBuffs: ResonanceBuffs;
  resonanceChain: ResonanceChainState;
  addTask: (title: string, className?: ClassName, tags?: TaskTag[]) => string | null;
  setFocusTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: QuestStatus) => void;
  progressTask: (taskId: string, note?: string) => ProgressResult | null;
  useScroll: (className: ClassName) => { lineId: string; isNew: boolean; upgraded: boolean; fromTier: number; toTier: number } | null;
  startShortRest: () => void;
  startLongRest: () => void;
  completeRest: () => void;
  cancelRest: () => void;
  getBackupData: () => QuestBackup;
  exportData: () => void;
  importData: (jsonString: string, options?: { markSyncedAt?: string }) => boolean;
  clearAll: () => void;
  markSynced: (syncedAt: string) => void;
};

const milestones = new Set([5, 10, 25, 50]);
const milestoneXpBonus: Record<number, number> = { 5: 25, 10: 50, 25: 75, 50: 100 };
const classNames: ClassName[] = ALL_CLASSES;
export const QUESTFLOW_BACKUP_VERSION = 10;
export const QUESTFLOW_COMPATIBILITY_VERSION = 10;

const getSkillLineIds = () => new Set(SKILL_LINES.map((line) => line.id));

const normalizeClassStates = (classStates: unknown): Record<ClassName, ClassState> => {
  const initial = initClassState();
  const source = classStates && typeof classStates === "object" ? classStates as Record<string, Partial<ClassState>> : {};
  const lineIds = getSkillLineIds();

  for (const cn of classNames) {
    const item = source[cn];
    if (!item) continue;
    const skills = Array.isArray(item.skills)
      ? item.skills
        .filter((skill): skill is OwnedSkill => {
          const candidate = skill as Partial<OwnedSkill>;
          return typeof candidate.lineId === "string" && lineIds.has(candidate.lineId);
        })
        .map((skill) => {
          const copies = Math.max(1, Math.floor(Number(skill.copies) || 1));
          return {
            lineId: skill.lineId,
            copies,
            currentTier: getTierFromCopies(copies)
          };
        })
      : [];

    initial[cn] = {
      xp: Math.max(0, Math.floor(Number(item.xp) || 0)),
      scrolls: Math.max(0, Math.floor(Number(item.scrolls) || 0)),
      skills,
      fatigue: Math.min(100, Math.max(0, Math.floor(Number(item.fatigue) || 0)))
    };
  }

  return initial;
};

const isClassName = (value: unknown): value is ClassName =>
  typeof value === "string" && classNames.includes(value as ClassName);

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeTasks = (tasks: unknown): QuestTask[] => {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task) => {
    const item = task as Partial<QuestTask>;
    const now = new Date().toISOString();
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : now;
    const updatedAt =
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : typeof item.lastFocusedAt === "string"
          ? item.lastFocusedAt
          : createdAt;

    return {
      id: typeof item.id === "string" ? item.id : makeId(),
      title: typeof item.title === "string" ? item.title : "Untitled Quest",
      progressCount: typeof item.progressCount === "number" ? item.progressCount : 0,
      status: item.status === "paused" || item.status === "archived" ? item.status : "active",
      className: isClassName(item.className) ? item.className : "Wizard",
      tags: Array.isArray(item.tags) ? item.tags.filter((t: string) => t === "important" || t === "urgent") as TaskTag[] : [],
      createdAt,
      updatedAt,
      lastFocusedAt: typeof item.lastFocusedAt === "string" ? item.lastFocusedAt : undefined
    };
  });
};

const getLocalDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isPreviousDay = (lastDay: string, currentDay: string) => {
  const last = new Date(`${lastDay}T00:00:00`);
  const current = new Date(`${currentDay}T00:00:00`);
  const diff = current.getTime() - last.getTime();
  return diff > 0 && diff <= 36 * 60 * 60 * 1000;
};

const nextStreak = (streak: StreakState, now: Date): StreakState => {
  const today = getLocalDayKey(now);
  if (streak.lastProgressDate === today) return streak;
  if (streak.lastProgressDate && isPreviousDay(streak.lastProgressDate, today)) {
    return { count: streak.count + 1, lastProgressDate: today };
  }
  return { count: 1, lastProgressDate: today };
};

export const getLevelProgress = (xp: number) => {
  const perLevel = 300;
  const level = Math.floor(xp / perLevel) + 1;
  const current = xp % perLevel;
  return {
    level,
    current,
    required: perLevel,
    percent: Math.min(100, Math.round((current / perLevel) * 100))
  };
};

const getDerivedUpdatedAt = (
  state: Pick<QuestStore, "dataUpdatedAt" | "tasks" | "logs">
) => {
  const candidates = [
    state.dataUpdatedAt,
    ...state.tasks.map((task) => task.updatedAt),
    ...state.logs.map((log) => log.at)
  ].filter(Boolean) as string[];

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
};

const createBackupData = (state: QuestStore): QuestBackup => {
  const exportedAt = new Date().toISOString();

  return {
    app: "questflow",
    version: QUESTFLOW_BACKUP_VERSION,
    exportedAt,
    updatedAt: getDerivedUpdatedAt(state) ?? exportedAt,
    tasks: state.tasks,
    logs: state.logs,
    focusTaskId: state.focusTaskId,
    totalXp: state.totalXp,
    streak: state.streak,
    momentumTaskId: state.momentumTaskId,
    momentumCount: state.momentumCount,
    classStates: state.classStates,
    lastProgressDate: state.lastProgressDate,
    lastSyncedAt: state.lastSyncedAt,
    lastProgressClass: state.lastProgressClass,
    discoveredResonances: state.discoveredResonances,
    resonanceBuffs: state.resonanceBuffs,
    resonanceChain: state.resonanceChain
  };
};

const downloadBackup = (data: QuestBackup) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `questflow-backup-v${QUESTFLOW_COMPATIBILITY_VERSION}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      logs: [],
      focusTaskId: undefined,
      totalXp: 0,
      streak: { count: 0 },
      momentumTaskId: undefined,
      momentumCount: 0,
      classStates: initClassState(),
      lastProgressDate: undefined,
      dataUpdatedAt: undefined,
      lastSyncedAt: undefined,
      lastProgressClass: undefined,
      restState: undefined,
      discoveredResonances: {},
      resonanceBuffs: createInitialResonanceBuffs(),
      resonanceChain: { count: 0 },

      addTask: (rawTitle, className: ClassName = "Wizard", tags: TaskTag[] = []) => {
        const title = rawTitle.trim();
        if (!title) return null;
        const now = new Date().toISOString();
        const task: QuestTask = {
          id: makeId(),
          title,
          progressCount: 0,
          status: "active",
          className,
          tags,
          createdAt: now,
          updatedAt: now,
          lastFocusedAt: now
        };
        set((state) => ({
          tasks: [task, ...state.tasks],
          focusTaskId: state.focusTaskId ?? task.id,
          dataUpdatedAt: now
        }));
        return task.id;
      },

      setFocusTask: (taskId) => {
        const now = new Date().toISOString();
        set((state) => ({
          focusTaskId: taskId,
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, lastFocusedAt: now } : task
          ),
          dataUpdatedAt: now
        }));
      },

      updateTaskStatus: (taskId, status) => {
        const now = new Date().toISOString();
        set((state) => {
          const nextTasks = state.tasks.map((task) =>
            task.id === taskId ? { ...task, status, updatedAt: now } : task
          );
          const nextFocus =
            state.focusTaskId === taskId && status === "archived"
              ? nextTasks.find((task) => task.status === "active")?.id
              : state.focusTaskId;
          return { tasks: nextTasks, focusTaskId: nextFocus, dataUpdatedAt: now };
        });
      },

      progressTask: (taskId, rawNote) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task || task.status === "archived") return null;

        const now = new Date();
        const at = now.toISOString();
        const progressCount = task.progressCount + 1;
        const taskClassName = isClassName(task.className) ? task.className : "Wizard";

        // Fatigue
        const fatigueBefore = state.classStates[taskClassName].fatigue;
        const fatigueAfter = Math.min(100, fatigueBefore + FATIGUE_PER_PROGRESS);
        const fatigueMultiplier = getFatigueMultiplier(fatigueBefore);

        // Tag bonus
        const tagBonus = getTagBonus(task.tags ?? []);

        // Class resonance: switching class from last progress
        const synergyActive = !!state.lastProgressClass && state.lastProgressClass !== taskClassName;
        const resonanceDefinition = synergyActive && state.lastProgressClass
          ? RESONANCE_MAP[getResonanceKey(state.lastProgressClass, taskClassName)]
          : undefined;
        const previousDiscovery = resonanceDefinition ? state.discoveredResonances[resonanceDefinition.key] : undefined;
        const resonance: ResonanceTrigger | undefined = resonanceDefinition
          ? {
              key: resonanceDefinition.key,
              name: resonanceDefinition.name,
              classes: resonanceDefinition.classes,
              reward: resonanceDefinition.reward,
              description: resonanceDefinition.description,
              discoveredAt: previousDiscovery?.discoveredAt ?? at,
              triggerCount: (previousDiscovery?.triggerCount ?? 0) + 1,
              level: getResonanceLevel((previousDiscovery?.triggerCount ?? 0) + 1),
              previousLevel: getResonanceLevel(previousDiscovery?.triggerCount ?? 0),
              leveledUp: getResonanceLevel((previousDiscovery?.triggerCount ?? 0) + 1) > getResonanceLevel(previousDiscovery?.triggerCount ?? 0),
              chainCount: state.resonanceChain.lastClass && state.resonanceChain.lastClass !== taskClassName ? state.resonanceChain.count + 1 : 1,
              chainBonus: state.resonanceChain.lastClass && state.resonanceChain.lastClass !== taskClassName ? state.resonanceChain.count + 1 >= 5 : false,
              isNew: !previousDiscovery
            }
          : undefined;

        // XP
        const momentum =
          state.momentumTaskId === taskId ? state.momentumCount + 1 : 1;
        const momentumBonus = momentum >= 3 ? 10 : 0;
        const milestone = milestones.has(progressCount) ? progressCount : undefined;
        const milestoneBonus = milestone ? (milestoneXpBonus[milestone] ?? 50) : 0;
        const resonanceBonusXp = resonance?.reward.type === "xp" ? 3 : 0;
        const baseXp = Math.round((5 + tagBonus + momentumBonus + milestoneBonus + resonanceBonusXp) * fatigueMultiplier);

        // Class XP
        let classXpAwarded = Math.round(5 * fatigueMultiplier);
        let scrollsAwarded = (resonance?.reward.type === "scroll" ? 1 : 0) + (resonance?.chainBonus ? 1 : 0);
        const nextResonanceBuffs = { ...state.resonanceBuffs };
        const forceAdvantage = nextResonanceBuffs.advantageChecks > 0;
        const criticalBonusChance = nextResonanceBuffs.luckyChecks > 0 ? 0.05 : 0;

        if (resonance?.reward.type === "advantage") nextResonanceBuffs.advantageChecks += 1;
        if (resonance?.reward.type === "lucky") nextResonanceBuffs.luckyChecks += 1;
        if (resonance?.reward.type === "doubleScroll") nextResonanceBuffs.doubleScrolls += 1;
        if (resonance?.reward.type === "longRestScroll") nextResonanceBuffs.longRestScrolls += 1;

        // Skill check (50% chance)
        let skillCheck: SkillCheckResult | undefined;
        const triggerCheck = Math.random() < 0.5;
        if (triggerCheck) {
          const classLevel = getClassLevel(state.classStates[taskClassName].xp);
          skillCheck = rollSkillCheck(taskClassName, classLevel, { forceAdvantage, criticalBonusChance });
          if (forceAdvantage) nextResonanceBuffs.advantageChecks = Math.max(0, nextResonanceBuffs.advantageChecks - 1);
          if (criticalBonusChance > 0) nextResonanceBuffs.luckyChecks = Math.max(0, nextResonanceBuffs.luckyChecks - 1);
          classXpAwarded += Math.round(skillCheck.xpBonus * fatigueMultiplier);

          // Scroll on success (1 for success, 2 for critical)
          if (skillCheck.scrollEarned) {
            const doubleScrollBonus = nextResonanceBuffs.doubleScrolls > 0 ? 1 : 0;
            scrollsAwarded += skillCheck.scrollCount + doubleScrollBonus;
            if (doubleScrollBonus > 0) nextResonanceBuffs.doubleScrolls = Math.max(0, nextResonanceBuffs.doubleScrolls - 1);
          }
        }

        // Map region change
        const oldRegion = getMapRegion(task.progressCount);
        const newRegionData = getMapRegion(progressCount);
        const newRegion = oldRegion.id !== newRegionData.id ? newRegionData.name : undefined;

        const nextStreakState = nextStreak(state.streak, now);
        const today = getLocalDayKey(now);
        const firstOfDay = state.lastProgressDate !== today;
        const note = rawNote?.trim() || "推进一步";

        const log: ProgressLog = {
          id: makeId(),
          taskId,
          note,
          at,
          xpAwarded: baseXp,
          classXpAwarded,
          progressCount,
          skillCheck,
          scrollEarned: scrollsAwarded > 0 ? (skillCheck?.scrollType ?? resonance?.reward.label) : undefined,
          scrollCount: scrollsAwarded > 0 ? scrollsAwarded : undefined,
          fatigueBefore,
          fatigueAfter: resonance?.reward.type === "fatigue" ? Math.max(0, fatigueAfter - 10) : fatigueAfter,
          synergyBonus: synergyActive,
          resonanceKey: resonance?.key,
          resonanceName: resonance?.name,
          resonanceReward: resonance?.reward.label
        };

        // Update class XP, scrolls and fatigue
        const finalFatigueAfter = resonance?.reward.type === "fatigue" ? Math.max(0, fatigueAfter - 10) : fatigueAfter;
        const updatedClassStates = { ...state.classStates };
        updatedClassStates[taskClassName] = {
          ...updatedClassStates[taskClassName],
          xp: updatedClassStates[taskClassName].xp + classXpAwarded,
          scrolls: updatedClassStates[taskClassName].scrolls + scrollsAwarded,
          fatigue: finalFatigueAfter
        };

        const updatedDiscoveries = resonance
          ? {
              ...state.discoveredResonances,
              [resonance.key]: {
                key: resonance.key,
                discoveredAt: resonance.discoveredAt,
                triggerCount: resonance.triggerCount
              }
            }
          : state.discoveredResonances;

        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  className: taskClassName,
                  status: item.status === "paused" ? "active" : item.status,
                  progressCount,
                  updatedAt: at
                }
              : item
          ),
          logs: [log, ...state.logs],
          focusTaskId: taskId,
          totalXp: state.totalXp + baseXp,
          streak: nextStreakState,
          momentumTaskId: taskId,
          momentumCount: momentum,
          classStates: updatedClassStates,
          lastProgressDate: firstOfDay ? today : state.lastProgressDate,
          lastProgressClass: taskClassName,
          discoveredResonances: updatedDiscoveries,
          resonanceBuffs: nextResonanceBuffs,
          resonanceChain: { count: resonance?.chainCount ?? 0, lastClass: taskClassName },
          dataUpdatedAt: at
        });

        return {
          taskId,
          taskTitle: task.title,
          progressCount,
          xpAwarded: baseXp,
          classXpAwarded,
          momentum,
          milestone,
          newRegion,
          streak: nextStreakState.count,
          firstOfDay,
          skillCheck,
          scrollEarned: scrollsAwarded > 0 ? (skillCheck?.scrollType ?? resonance?.reward.label) : undefined,
          scrollCount: scrollsAwarded > 0 ? scrollsAwarded : undefined,
          fatigueBefore,
          fatigueAfter: finalFatigueAfter,
          synergyBonus: synergyActive,
          resonance,
          at
        };
      },

      useScroll: (className: ClassName) => {
        const state = get();
        const cs = state.classStates[className];
        if (cs.scrolls <= 0) return null;

        const result = learnSkillFromScroll(className, cs.skills);
        if (!result) return null;

        const updatedSkills = [...cs.skills];
        const existingIdx = updatedSkills.findIndex((s) => s.lineId === result.lineId);

        if (existingIdx >= 0) {
          const existing = updatedSkills[existingIdx];
          const newCopies = existing.copies + 1;
          updatedSkills[existingIdx] = {
            ...existing,
            copies: newCopies,
            currentTier: getTierFromCopies(newCopies)
          };
        } else {
          updatedSkills.push({
            lineId: result.lineId,
            copies: 1,
            currentTier: 1
          });
        }

        set({
          classStates: {
            ...state.classStates,
            [className]: { ...cs, scrolls: cs.scrolls - 1, skills: updatedSkills }
          },
          dataUpdatedAt: new Date().toISOString()
        });

        return result;
      },

      getBackupData: () => createBackupData(get()),

      exportData: () => {
        downloadBackup(createBackupData(get()));
      },

      importData: (jsonString: string, options): boolean => {
        try {
          const data = JSON.parse(jsonString);
          if (!data.tasks) return false;
          const now = new Date().toISOString();
          const importedUpdatedAt = data.updatedAt ?? data.exportedAt ?? now;
          set({
            tasks: normalizeTasks(data.tasks),
            logs: data.logs ?? [],
            focusTaskId: data.focusTaskId,
            totalXp: data.totalXp ?? 0,
            streak: data.streak ?? { count: 0 },
            momentumTaskId: data.momentumTaskId,
            momentumCount: data.momentumCount ?? 0,
            classStates: normalizeClassStates(data.classStates),
            lastProgressDate: data.lastProgressDate,
            dataUpdatedAt: importedUpdatedAt,
            lastSyncedAt: options?.markSyncedAt ?? data.lastSyncedAt,
            lastProgressClass: isClassName(data.lastProgressClass) ? data.lastProgressClass : undefined,
            discoveredResonances: data.discoveredResonances ?? {},
            resonanceBuffs: data.resonanceBuffs ?? createInitialResonanceBuffs(),
            resonanceChain: data.resonanceChain ?? { count: 0 }
          });
          return true;
        } catch {
          return false;
        }
      },

      clearAll: () => {
        const now = new Date().toISOString();
        set({
          tasks: [],
          logs: [],
          focusTaskId: undefined,
          totalXp: 0,
          streak: { count: 0 },
          momentumTaskId: undefined,
          momentumCount: 0,
          classStates: initClassState(),
          lastProgressDate: undefined,
          dataUpdatedAt: now,
          lastSyncedAt: undefined,
          lastProgressClass: undefined,
          restState: undefined,
          discoveredResonances: {},
          resonanceBuffs: createInitialResonanceBuffs(),
          resonanceChain: { count: 0 }
        });
      },

      startShortRest: () => {
        const state = get();
        if (state.restState) return;
        const now = new Date();
        const endsAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
        set({ restState: { type: "short", startedAt: now.toISOString(), endsAt }, dataUpdatedAt: now.toISOString() });
      },

      startLongRest: () => {
        const state = get();
        if (state.restState) return;
        const now = new Date();
        const endsAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        set({ restState: { type: "long", startedAt: now.toISOString(), endsAt }, dataUpdatedAt: now.toISOString() });
      },

      completeRest: () => {
        const state = get();
        if (!state.restState) return;
        const updatedClassStates = { ...state.classStates };

        if (state.restState.type === "short") {
          // Short rest: reduce fatigue by 30%, min 0
          for (const cn of classNames) {
            updatedClassStates[cn] = {
              ...updatedClassStates[cn],
              fatigue: Math.max(0, updatedClassStates[cn].fatigue - SHORT_REST_RECOVERY)
            };
          }
        } else {
          // Long rest: reset all fatigue to 0
          for (const cn of classNames) {
            updatedClassStates[cn] = {
              ...updatedClassStates[cn],
              fatigue: 0
            };
          }
          if (state.resonanceBuffs.longRestScrolls > 0) {
            const targetClass = state.lastProgressClass ?? "Wizard";
            updatedClassStates[targetClass] = {
              ...updatedClassStates[targetClass],
              scrolls: updatedClassStates[targetClass].scrolls + state.resonanceBuffs.longRestScrolls
            };
          }
        }

        const nextResonanceBuffs = state.restState.type === "long"
          ? { ...state.resonanceBuffs, longRestScrolls: 0 }
          : state.resonanceBuffs;
        const now = new Date().toISOString();
        set({ classStates: updatedClassStates, restState: undefined, resonanceBuffs: nextResonanceBuffs, dataUpdatedAt: now });
      },

      cancelRest: () => {
        set({ restState: undefined });
      },

      markSynced: (syncedAt) => {
        set({ lastSyncedAt: syncedAt });
      }
    }),
    {
      name: "questflow-v1",
      storage: createJSONStorage(() => localStorage),
      version: QUESTFLOW_BACKUP_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        let data = persisted;

        if (version < 3) {
          data = {
            ...persisted,
            totalXp: persisted.xp ?? 0,
            classStates: initClassState(),
            lastProgressDate: undefined
          };
        }

        // v3→v4: recompute all skill tiers from copies using 2^(n-1) formula
        if (version < 4 && data.classStates) {
          const cs = data.classStates as Record<string, { skills: OwnedSkill[] }>;
          for (const key of Object.keys(cs)) {
            cs[key].skills = cs[key].skills.map((s) => ({
              ...s,
              currentTier: getTierFromCopies(s.copies)
            }));
          }
        }

        // v4→v5: reset skills to new line-based system (incompatible structure change)
        if (version < 5 && data.classStates) {
          const cs = data.classStates as Record<string, { skills: unknown[]; scrolls: number }>;
          for (const key of Object.keys(cs)) {
            cs[key].skills = [];
          }
        }

        // v5→v6: add sync timestamps for WebDAV conflict detection
        if (version < 6) {
          const tasks = (data.tasks as Array<{ updatedAt?: string }> | undefined) ?? [];
          const logs = (data.logs as Array<{ at?: string }> | undefined) ?? [];
          const candidates = [
            data.dataUpdatedAt as string | undefined,
            ...tasks.map((task) => task.updatedAt),
            ...logs.map((log) => log.at)
          ].filter(Boolean) as string[];
          data = {
            ...data,
            tasks: normalizeTasks(data.tasks),
            dataUpdatedAt:
              candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
              undefined,
            lastSyncedAt: data.lastSyncedAt
          };
        }

        // v6→v7: add fatigue to ClassState, tags to QuestTask, lastProgressClass
        if (version < 7) {
          if (data.classStates) {
            const cs = data.classStates as Record<string, { fatigue?: number; skills: unknown[]; scrolls: number; xp: number }>;
            for (const key of Object.keys(cs)) {
              if (typeof cs[key].fatigue !== "number") {
                cs[key].fatigue = 0;
              }
            }
          }
          if (data.tasks) {
            data.tasks = normalizeTasks(data.tasks);
          }
          data = {
            ...data,
            lastProgressClass: data.lastProgressClass ?? undefined,
            restState: undefined
          };
        }

        // v7→v8: add 7 new classes (Paladin, Ranger, Druid, Warlock, Sorcerer, Monk, Barbarian)
        if (version < 8) {
          if (data.classStates) {
            const cs = data.classStates as Record<string, unknown>;
            const newClasses = ["Paladin", "Ranger", "Druid", "Warlock", "Sorcerer", "Monk", "Barbarian"];
            for (const cn of newClasses) {
              if (!cs[cn]) {
                cs[cn] = { xp: 0, scrolls: 0, skills: [], fatigue: 0 };
              }
            }
          }
        }

        // v8→v9: add class resonance collection and pending resonance buffs
        if (version < 9) {
          data = {
            ...data,
            discoveredResonances: data.discoveredResonances ?? {},
            resonanceBuffs: data.resonanceBuffs ?? createInitialResonanceBuffs()
          };
        }

        // v9→v10: add resonance chain counter
        if (version < 10) {
          data = {
            ...data,
            resonanceChain: data.resonanceChain ?? { count: 0 }
          };
        }

        return data;
      }
    }
  )
);
