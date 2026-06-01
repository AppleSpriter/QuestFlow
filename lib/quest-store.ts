"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type ClassName,
  type ClassState,
  type SkillCheckResult,
  type OwnedSkill,
  initClassState,
  getClassLevel,
  rollSkillCheck,
  learnSkillFromScroll,
  getLineById,
  getSkillNameAtTier,
  getTierFromCopies,
  getMapRegion
} from "@/data/classes";

export type QuestStatus = "active" | "paused" | "archived";

export type QuestTask = {
  id: string;
  title: string;
  progressCount: number;
  status: QuestStatus;
  className: ClassName;
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
  at: string;
};

export type StreakState = {
  count: number;
  lastProgressDate?: string;
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
  addTask: (title: string, className?: ClassName) => string | null;
  setFocusTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: QuestStatus) => void;
  progressTask: (taskId: string, note?: string) => ProgressResult | null;
  useScroll: (className: ClassName) => { lineId: string; isNew: boolean; upgraded: boolean; fromTier: number; toTier: number } | null;
  getBackupData: () => QuestBackup;
  exportData: () => void;
  importData: (jsonString: string, options?: { markSyncedAt?: string }) => boolean;
  clearAll: () => void;
  markSynced: (syncedAt: string) => void;
};

const milestones = new Set([5, 10, 25, 50]);
const milestoneXpBonus: Record<number, number> = { 5: 25, 10: 50, 25: 75, 50: 100 };
const classNames: ClassName[] = ["Wizard", "Fighter", "Rogue", "Bard", "Cleric"];

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
    version: 6,
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
    lastSyncedAt: state.lastSyncedAt
  };
};

const downloadBackup = (data: QuestBackup) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "questflow-backup.json";
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

      addTask: (rawTitle, className: ClassName = "Wizard") => {
        const title = rawTitle.trim();
        if (!title) return null;
        const now = new Date().toISOString();
        const task: QuestTask = {
          id: makeId(),
          title,
          progressCount: 0,
          status: "active",
          className,
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

        // XP
        const momentum =
          state.momentumTaskId === taskId ? state.momentumCount + 1 : 1;
        const momentumBonus = momentum >= 3 ? 10 : 0;
        const milestone = milestones.has(progressCount) ? progressCount : undefined;
        const milestoneBonus = milestone ? (milestoneXpBonus[milestone] ?? 50) : 0;
        const baseXp = 5 + momentumBonus + milestoneBonus;

        // Class XP
        let classXpAwarded = 5;
        let scrollsAwarded = 0;

        // Skill check (50% chance)
        let skillCheck: SkillCheckResult | undefined;
        const triggerCheck = Math.random() < 0.5;
        if (triggerCheck) {
          const classLevel = getClassLevel(state.classStates[taskClassName].xp);
          skillCheck = rollSkillCheck(taskClassName, classLevel);
          classXpAwarded += skillCheck.xpBonus;

          // Scroll on success (1 for success, 2 for critical)
          if (skillCheck.scrollEarned) {
            scrollsAwarded = skillCheck.scrollCount;
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
          scrollEarned: skillCheck?.scrollEarned ? skillCheck.scrollType : undefined,
          scrollCount: skillCheck?.scrollCount
        };

        // Update class XP and scrolls
        const updatedClassStates = { ...state.classStates };
        updatedClassStates[taskClassName] = {
          ...updatedClassStates[taskClassName],
          xp: updatedClassStates[taskClassName].xp + classXpAwarded,
          scrolls: updatedClassStates[taskClassName].scrolls + scrollsAwarded
        };

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
          scrollEarned: skillCheck?.scrollEarned ? skillCheck.scrollType : undefined,
          scrollCount: skillCheck?.scrollCount,
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
            classStates: data.classStates ?? initClassState(),
            lastProgressDate: data.lastProgressDate,
            dataUpdatedAt: importedUpdatedAt,
            lastSyncedAt: options?.markSyncedAt ?? data.lastSyncedAt
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
          lastSyncedAt: undefined
        });
      },

      markSynced: (syncedAt) => {
        set({ lastSyncedAt: syncedAt });
      }
    }),
    {
      name: "questflow-v1",
      storage: createJSONStorage(() => localStorage),
      version: 6,
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

        return data;
      }
    }
  )
);
