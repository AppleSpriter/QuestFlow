"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type QuestStatus = "active" | "paused" | "archived";
export type AgentName = "Codex" | "Claude Code" | "Cursor Agent" | "Gemini" | "None";

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
  progressCount: number;
};

export type ProgressResult = {
  taskId: string;
  taskTitle: string;
  progressCount: number;
  xpAwarded: number;
  momentum: number;
  milestone?: number;
  streak: number;
  at: string;
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
  streak: StreakState;
  momentumTaskId?: string;
  momentumCount: number;
  addTask: (title: string, agent?: AgentName) => string | null;
  setFocusTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: QuestStatus) => void;
  progressTask: (taskId: string, note?: string) => ProgressResult | null;
};

const milestones = new Set([5, 10, 25, 50]);

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

  if (streak.lastProgressDate === today) {
    return streak;
  }

  if (streak.lastProgressDate && isPreviousDay(streak.lastProgressDate, today)) {
    return {
      count: streak.count + 1,
      lastProgressDate: today
    };
  }

  return {
    count: 1,
    lastProgressDate: today
  };
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

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      logs: [],
      focusTaskId: undefined,
      xp: 0,
      streak: {
        count: 0
      },
      momentumTaskId: undefined,
      momentumCount: 0,
      addTask: (rawTitle, agent = "Codex") => {
        const title = rawTitle.trim();

        if (!title) {
          return null;
        }

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
            task.id === taskId
              ? {
                  ...task,
                  lastFocusedAt: now
                }
              : task
          )
        }));
      },
      updateTaskStatus: (taskId, status) => {
        const now = new Date().toISOString();

        set((state) => {
          const nextTasks = state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  updatedAt: now
                }
              : task
          );
          const nextFocus =
            state.focusTaskId === taskId && status === "archived"
              ? nextTasks.find((task) => task.status === "active")?.id
              : state.focusTaskId;

          return {
            tasks: nextTasks,
            focusTaskId: nextFocus
          };
        });
      },
      progressTask: (taskId, rawNote) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);

        if (!task || task.status === "archived") {
          return null;
        }

        const now = new Date();
        const at = now.toISOString();
        const progressCount = task.progressCount + 1;
        const momentum =
          state.momentumTaskId === taskId ? state.momentumCount + 1 : 1;
        const momentumBonus = momentum >= 3 ? 10 : 0;
        const milestone = milestones.has(progressCount) ? progressCount : undefined;
        const milestoneBonus = milestone ? 50 : 0;
        const xpAwarded = 5 + momentumBonus + milestoneBonus;
        const nextStreakState = nextStreak(state.streak, now);
        const note = rawNote?.trim() || "推进一步";
        const log: ProgressLog = {
          id: makeId(),
          taskId,
          note,
          at,
          xpAwarded,
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
          streak: nextStreakState,
          momentumTaskId: taskId,
          momentumCount: momentum
        });

        return {
          taskId,
          taskTitle: task.title,
          progressCount,
          xpAwarded,
          momentum,
          milestone,
          streak: nextStreakState.count,
          at
        };
      }
    }),
    {
      name: "questflow-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
);
