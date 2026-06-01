"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ALL_COMPANIONS,
  type Companion,
  type CompanionRarity,
  getCompanionLine,
  type CompanionMood,
  getMapRegion,
  rollCompanion,
  rollTen,
  GACHA_COST_SINGLE,
  GACHA_COST_TEN
} from "@/data/companions";

export type QuestStatus = "active" | "paused" | "archived";
export type AgentName = "Codex" | "openclaw" | "Claude Code" | "Gemini" | "dodo" | "None";

export type QuestTask = {
  id: string;
  title: string;
  description?: string;
  progressCount: number;
  status: QuestStatus;
  agent: AgentName;
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
  crystalsAwarded: number;
  progressCount: number;
};

export type ProgressResult = {
  taskId: string;
  taskTitle: string;
  progressCount: number;
  xpAwarded: number;
  crystalsAwarded: number;
  momentum: number;
  milestone?: number;
  newRegion?: string;
  streak: number;
  firstOfDay: boolean;
  at: string;
};

export type OwnedCompanion = {
  id: string;
  owned: boolean;
  level: number;
  copies: number;
  obtainedAt?: string;
};

export type GachaResult = {
  companion: Companion;
  isNew: boolean;
};

type StreakState = {
  count: number;
  lastProgressDate?: string;
};

type QuestStore = {
  tasks: QuestTask[];
  logs: ProgressLog[];
  focusTaskId?: string;
  xp: number;
  crystals: number;
  streak: StreakState;
  momentumTaskId?: string;
  momentumCount: number;
  // 游戏化
  companions: OwnedCompanion[];
  activeCompanionId?: string;
  gachaHistory: Array<{ id: string; companionId: string; rarity: CompanionRarity; at: string }>;
  lastProgressDate?: string; // 用于每日首次判断
  // Actions
  addTask: (title: string, agent?: AgentName) => string | null;
  setFocusTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: QuestStatus) => void;
  progressTask: (taskId: string, note?: string) => ProgressResult | null;
  gachaSingle: () => GachaResult | null;
  gachaTen: () => GachaResult[] | null;
  setActiveCompanion: (companionId: string) => void;
  getCompanionLineForMood: (mood: CompanionMood) => string;
  isAllActiveProgressedToday: () => boolean;
  exportData: () => void;
  importData: (jsonString: string) => boolean;
};

const milestones = new Set([5, 10, 25, 50]);
const milestoneCrystalBonus: Record<number, number> = { 5: 5, 10: 10, 25: 15, 50: 25 };

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

const initCompanions = (): OwnedCompanion[] =>
  ALL_COMPANIONS.map((c) => ({ id: c.id, owned: false, level: 1, copies: 0 }));

const getOwned = (companions: OwnedCompanion[], companionId: string): OwnedCompanion | undefined =>
  companions.find((c) => c.id === companionId);

const addOrDupe = (companions: OwnedCompanion[], companionId: string): OwnedCompanion[] => {
  const now = new Date().toISOString();
  const existing = getOwned(companions, companionId);
  if (existing?.owned) {
    return companions.map((c) =>
      c.id === companionId ? { ...c, copies: c.copies + 1 } : c
    );
  }
  return companions.map((c) =>
    c.id === companionId ? { ...c, owned: true, copies: 1, obtainedAt: now } : c
  );
};

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      logs: [],
      focusTaskId: undefined,
      xp: 0,
      crystals: 0,
      streak: { count: 0 },
      momentumTaskId: undefined,
      momentumCount: 0,
      companions: initCompanions(),
      activeCompanionId: undefined,
      gachaHistory: [],
      lastProgressDate: undefined,

      addTask: (rawTitle, agent = "openclaw") => {
        const title = rawTitle.trim();
        if (!title) return null;
        const now = new Date().toISOString();
        const task: QuestTask = {
          id: makeId(),
          title,
          progressCount: 0,
          status: "active",
          agent,
          createdAt: now,
          updatedAt: now,
          lastFocusedAt: now
        };
        set((state) => ({
          tasks: [task, ...state.tasks],
          focusTaskId: state.focusTaskId ?? task.id
        }));
        return task.id;
      },

      setFocusTask: (taskId) => {
        const now = new Date().toISOString();
        set((state) => ({
          focusTaskId: taskId,
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, lastFocusedAt: now } : task
          )
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
          return { tasks: nextTasks, focusTaskId: nextFocus };
        });
      },

      progressTask: (taskId, rawNote) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task || task.status === "archived") return null;

        const now = new Date();
        const at = now.toISOString();
        const progressCount = task.progressCount + 1;

        // XP
        const momentum =
          state.momentumTaskId === taskId ? state.momentumCount + 1 : 1;
        const momentumBonus = momentum >= 3 ? 10 : 0;
        const milestone = milestones.has(progressCount) ? progressCount : undefined;
        const milestoneBonus = milestone ? 50 : 0;
        const xpAwarded = 5 + momentumBonus + milestoneBonus;

        // Crystals
        let crystalsAwarded = 1; // 基础
        if (momentum >= 3) crystalsAwarded += 3; // 连续推进
        if (milestone && milestoneCrystalBonus[milestone]) {
          crystalsAwarded += milestoneCrystalBonus[milestone];
        }
        // 每日首次推进
        const today = getLocalDayKey(now);
        const firstOfDay = state.lastProgressDate !== today;
        if (firstOfDay) crystalsAwarded += 3;

        // 地图区域变化
        const oldRegion = getMapRegion(task.progressCount);
        const newRegionData = getMapRegion(progressCount);
        const newRegion = oldRegion.id !== newRegionData.id ? newRegionData.name : undefined;

        const nextStreakState = nextStreak(state.streak, now);
        const note = rawNote?.trim() || "推进一步";
        const log: ProgressLog = {
          id: makeId(),
          taskId,
          note,
          at,
          xpAwarded,
          crystalsAwarded,
          progressCount
        };

        set({
          tasks: state.tasks.map((item) =>
            item.id === taskId
              ? {
                  ...item,
                  status: item.status === "paused" ? "active" : item.status,
                  progressCount,
                  updatedAt: at
                }
              : item
          ),
          logs: [log, ...state.logs],
          focusTaskId: taskId,
          xp: state.xp + xpAwarded,
          crystals: state.crystals + crystalsAwarded,
          streak: nextStreakState,
          momentumTaskId: taskId,
          momentumCount: momentum,
          lastProgressDate: firstOfDay ? today : state.lastProgressDate
        });

        return {
          taskId,
          taskTitle: task.title,
          progressCount,
          xpAwarded,
          crystalsAwarded,
          momentum,
          milestone,
          newRegion,
          streak: nextStreakState.count,
          firstOfDay,
          at
        };
      },

      gachaSingle: () => {
        const state = get();
        if (state.crystals < GACHA_COST_SINGLE) return null;
        const companion = rollCompanion();
        const existing = getOwned(state.companions, companion.id);
        const isNew = !existing?.owned;
        const now = new Date().toISOString();

        set({
          crystals: state.crystals - GACHA_COST_SINGLE,
          companions: addOrDupe(state.companions, companion.id),
          gachaHistory: [
            { id: makeId(), companionId: companion.id, rarity: companion.rarity, at: now },
            ...state.gachaHistory
          ],
          activeCompanionId: isNew ? companion.id : state.activeCompanionId
        });

        return { companion, isNew };
      },

      gachaTen: () => {
        const state = get();
        if (state.crystals < GACHA_COST_TEN) return null;
        const rolled = rollTen();
        const results: GachaResult[] = [];
        let newCompanionId: string | undefined;
        const now = new Date().toISOString();
        let updatedCompanions = state.companions;

        for (const companion of rolled) {
          const existing = getOwned(updatedCompanions, companion.id);
          const isNew = !existing?.owned;
          if (isNew) newCompanionId = companion.id;
          updatedCompanions = addOrDupe(updatedCompanions, companion.id);
          results.push({ companion, isNew });
        }

        const newHistory = rolled.map((c) => ({
          id: makeId(),
          companionId: c.id,
          rarity: c.rarity,
          at: now
        }));

        set({
          crystals: state.crystals - GACHA_COST_TEN,
          companions: updatedCompanions,
          gachaHistory: [...newHistory, ...state.gachaHistory],
          activeCompanionId: newCompanionId ?? state.activeCompanionId
        });

        return results;
      },

      setActiveCompanion: (companionId) => {
        set({ activeCompanionId: companionId });
      },

      getCompanionLineForMood: (mood: CompanionMood) => {
        return getCompanionLine(mood);
      },

      isAllActiveProgressedToday: () => {
        const state = get();
        const today = getLocalDayKey(new Date());
        const activeTasks = state.tasks.filter((t) => t.status === "active");
        if (activeTasks.length === 0) return false;
        return activeTasks.every((t) => getLocalDayKey(new Date(t.updatedAt)) === today);
      },

      exportData: () => {
        const state = get();
        const data = {
          version: 2,
          exportedAt: new Date().toISOString(),
          tasks: state.tasks,
          logs: state.logs,
          focusTaskId: state.focusTaskId,
          xp: state.xp,
          crystals: state.crystals,
          streak: state.streak,
          momentumTaskId: state.momentumTaskId,
          momentumCount: state.momentumCount,
          companions: state.companions,
          activeCompanionId: state.activeCompanionId,
          gachaHistory: state.gachaHistory,
          lastProgressDate: state.lastProgressDate
        };
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
      },

      importData: (jsonString: string): boolean => {
        try {
          const data = JSON.parse(jsonString);
          if (!data.version || !data.tasks) return false;
          // v1 数据兼容
          if (data.version === 1) {
            data.crystals = 0;
            data.companions = initCompanions();
            data.activeCompanionId = undefined;
            data.gachaHistory = [];
            data.lastProgressDate = undefined;
          }
          set({
            tasks: data.tasks ?? [],
            logs: data.logs ?? [],
            focusTaskId: data.focusTaskId,
            xp: data.xp ?? 0,
            crystals: data.crystals ?? 0,
            streak: data.streak ?? { count: 0 },
            momentumTaskId: data.momentumTaskId,
            momentumCount: data.momentumCount ?? 0,
            companions: data.companions ?? initCompanions(),
            activeCompanionId: data.activeCompanionId,
            gachaHistory: data.gachaHistory ?? [],
            lastProgressDate: data.lastProgressDate
          });
          return true;
        } catch {
          return false;
        }
      }
    }),
    {
      name: "questflow-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        if (version === 1) {
          return {
            ...persisted,
            crystals: 0,
            companions: initCompanions(),
            activeCompanionId: undefined,
            gachaHistory: [],
            lastProgressDate: undefined
          };
        }
        return persisted;
      }
    }
  )
);
