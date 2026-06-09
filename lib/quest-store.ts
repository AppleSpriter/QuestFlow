"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type ClassName,
  type ClassState,
  type TaskTag,
  ALL_CLASSES,
  CLASS_META,
  initClassState,
  getClassLevel,
  rollSkillCheck,
  learnSkillFromScroll,
  getLineById,
  getSkillNameAtTier,
  getTierFromCopies,
  SHORT_REST_RECOVERY
} from "@/data/classes";
import {
  type ResonanceBuffs,
  type ResonanceChainState,
  type ResonanceTrigger,
  RESONANCE_MAP,
  createInitialResonanceBuffs,
  getResonanceKey,
  getResonanceLevel
} from "@/data/resonance";
import {
  RESONANCE_FATIGUE_RECOVERY,
  RESONANCE_XP_BONUS,
  calculateProgressReward
} from "@/lib/progress-rewards";
import {
  FEAT_MAP,
  createInitialFeatState,
  refreshPendingFeatChoices,
  hasFeat,
  type FeatState
} from "@/data/feats";
import {
  makeId,
  isClassName,
  isTaskTag,
  isProgressTagColorId,
  normalizeTasks,
  normalizeTodos,
  normalizeLogs,
  normalizeProgressTags,
  normalizeProgressTagSnapshots,
  normalizeFeatState,
  normalizeClassStates,
} from "@/lib/normalizers";
import type {
  QuestStatus,
  ProgressTagColorId,
  ProgressTag,
  ProgressTagSnapshot,
  QuestTask,
  QuestTodoItem,
  ProgressLog,
  ProgressResult,
  StreakState,
  RestState,
  LongRestSummary,
  QuestBackup,
  ProgressTaskOptions,
  RecurringTaskFrequency,
} from "@/lib/types";

// Re-export shared types
export type {
  QuestStatus,
  ProgressLogType,
  RecurringTaskFrequency,
  ProgressTagColorId,
  ProgressTagColorMeta,
  ProgressTag,
  ProgressTagSnapshot,
  QuestTodoItem,
  QuestTask,
  ProgressLog,
  ProgressResult,
  StreakState,
  RestState,
  LongRestSummary,
  QuestBackup,
  ProgressTaskOptions,
} from "@/lib/types";
export {
  makeId,
  isClassName,
  isTaskTag,
  isProgressTagColorId,
  normalizeTasks,
  normalizeTodos,
  normalizeLogs,
  normalizeProgressTags,
  normalizeProgressTagSnapshots,
  normalizeFeatState,
  normalizeClassStates,
} from "@/lib/normalizers";

export const PROGRESS_TAG_COLORS = {
  blue: { id: "blue" as const, label: "星河蓝", textColor: "#1d4ed8", bgColor: "#dbeafe", borderColor: "#60a5fa" },
  emerald: { id: "emerald" as const, label: "翡翠绿", textColor: "#047857", bgColor: "#d1fae5", borderColor: "#34d399" },
  violet: { id: "violet" as const, label: "秘法紫", textColor: "#6d28d9", bgColor: "#ede9fe", borderColor: "#a78bfa" },
  amber: { id: "amber" as const, label: "鎏金黄", textColor: "#b45309", bgColor: "#fef3c7", borderColor: "#f59e0b" },
  rose: { id: "rose" as const, label: "蔷薇红", textColor: "#be123c", bgColor: "#ffe4e6", borderColor: "#fb7185" },
  sky: { id: "sky" as const, label: "电光青", textColor: "#0369a1", bgColor: "#e0f2fe", borderColor: "#38bdf8" },
  slate: { id: "slate" as const, label: "月影灰", textColor: "#475569", bgColor: "#f1f5f9", borderColor: "#94a3b8" },
  fuchsia: { id: "fuchsia" as const, label: "霓虹粉紫", textColor: "#a21caf", bgColor: "#fae8ff", borderColor: "#e879f9" },
  cyan: { id: "cyan" as const, label: "赛博青", textColor: "#0e7490", bgColor: "#cffafe", borderColor: "#22d3ee" },
  lime: { id: "lime" as const, label: "荧光绿", textColor: "#4d7c0f", bgColor: "#ecfccb", borderColor: "#a3e635" },
  orange: { id: "orange" as const, label: "熔岩橙", textColor: "#c2410c", bgColor: "#ffedd5", borderColor: "#fb923c" },
  indigo: { id: "indigo" as const, label: "深空靛", textColor: "#4338ca", bgColor: "#e0e7ff", borderColor: "#818cf8" },
  pink: { id: "pink" as const, label: "糖果粉", textColor: "#be185d", bgColor: "#fce7f3", borderColor: "#f472b6" }
} as const satisfies Record<string, { id: string; label: string; textColor: string; bgColor: string; borderColor: string }>;

export const DEFAULT_PROGRESS_TAG_COLOR: ProgressTagColorId = "blue";

const STORAGE_KEY = "questflow-v1";
const STORAGE_BACKUP_KEY = "questflow-v1.backup";
const LOCAL_STORAGE_WARN_BYTES = 4.5 * 1024 * 1024;

const byteSize = (value: string) => new Blob([value]).size;

const localStorageProvider = () => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
  }
  return {
    getItem: (name: string) => window.localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      const size = byteSize(value);
      if (size > LOCAL_STORAGE_WARN_BYTES) {
        console.warn(`[QuestFlow] localStorage payload is ${(size / 1024 / 1024).toFixed(2)}MB; export or prune logs soon.`);
      }
      try {
        window.localStorage.setItem(name, value);
      } catch (error) {
        console.error("[QuestFlow] Failed to persist localStorage state.", error);
        throw error;
      }
    },
    removeItem: (name: string) => window.localStorage.removeItem(name),
  };
};

const snapshotCurrentLocalState = () => {
  if (typeof window === "undefined") return;
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (!current) return;
  window.localStorage.setItem(STORAGE_BACKUP_KEY, current);
};

const classNames: ClassName[] = ALL_CLASSES;
let _lastRefreshRecurringAt = 0;

export const QUESTFLOW_BACKUP_VERSION = 15;
export const QUESTFLOW_COMPATIBILITY_VERSION = 15;

// ─── Recurring helpers ───

const getRecurringFrequency = (tags: TaskTag[]): RecurringTaskFrequency | undefined => {
  if (tags.includes("daily")) return "daily";
  if (tags.includes("weekly")) return "weekly";
  return undefined;
};

const getLocalDayKey = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRecurringKey = (date: Date, frequency: RecurringTaskFrequency) => {
  if (frequency === "daily") return getLocalDayKey(date);
  const normalized = new Date(date);
  // UTC Monday-based week key
  const utcDay = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() - utcDay + 1);
  return getLocalDayKey(normalized);
};

const isPreviousDay = (lastDay: string, currentDay: string) => {
  const last = new Date(`${lastDay}T00:00:00Z`);
  const current = new Date(`${currentDay}T00:00:00Z`);
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
  return { level, current, required: perLevel, percent: Math.min(100, Math.round((current / perLevel) * 100)) };
};

// ─── Resonance helpers ───

const addResonanceReward = (
  rewardType: string,
  nextResonanceBuffs: ResonanceBuffs,
  rewardBonuses: { xp: number; scrolls: number; fatigueRecovery: number }
) => {
  if (rewardType === "xp") rewardBonuses.xp += RESONANCE_XP_BONUS;
  if (rewardType === "scroll") rewardBonuses.scrolls += 1;
  if (rewardType === "fatigue") rewardBonuses.fatigueRecovery += RESONANCE_FATIGUE_RECOVERY;
  if (rewardType === "advantage") nextResonanceBuffs.advantageChecks += 1;
  if (rewardType === "lucky") nextResonanceBuffs.luckyChecks += 1;
  if (rewardType === "doubleScroll") nextResonanceBuffs.doubleScrolls += 1;
  if (rewardType === "longRestScroll") nextResonanceBuffs.longRestScrolls += 1;
};

// ─── Backup helpers ───

const getDerivedUpdatedAt = (state: Pick<QuestStore, "dataUpdatedAt" | "tasks" | "logs">) => {
  const candidates = [state.dataUpdatedAt, ...state.tasks.map((t) => t.updatedAt), ...state.logs.map((l) => l.at)].filter(Boolean) as string[];
  return candidates.length > 0 ? candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined;
};

const createBackupData = (state: QuestStore): QuestBackup => {
  const exportedAt = new Date().toISOString();
  return {
    app: "questflow", version: QUESTFLOW_BACKUP_VERSION, exportedAt,
    updatedAt: getDerivedUpdatedAt(state) ?? exportedAt,
    tasks: state.tasks, logs: state.logs, focusTaskId: state.focusTaskId,
    totalXp: state.totalXp, streak: state.streak, momentumTaskId: state.momentumTaskId,
    momentumCount: state.momentumCount, classStates: state.classStates,
    lastProgressDate: state.lastProgressDate, lastSyncedAt: state.lastSyncedAt,
    lastProgressClass: state.lastProgressClass, discoveredResonances: state.discoveredResonances,
    resonanceBuffs: state.resonanceBuffs, resonanceChain: state.resonanceChain,
    featState: state.featState, progressTags: state.progressTags
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

// ─── Store type ───

type UndoSnapshot = {
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
  discoveredResonances: Record<string, { key: string; discoveredAt: string; triggerCount: number }>;
  resonanceBuffs: ResonanceBuffs;
  resonanceChain: ResonanceChainState;
  featState: FeatState;
  progressTags: ProgressTag[];
};

type UndoEntry = {
  label: string;
  createdAt: string;
  snapshot: UndoSnapshot;
};

type QuestStoreState = {
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
  discoveredResonances: Record<string, { key: string; discoveredAt: string; triggerCount: number }>;
  resonanceBuffs: ResonanceBuffs;
  resonanceChain: ResonanceChainState;
  featState: FeatState;
  progressTags: ProgressTag[];
  lastUndo?: UndoEntry;
  addTask: (title: string, className?: ClassName, tags?: TaskTag[]) => string | null;
  setFocusTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: QuestStatus) => void;
  updateTaskTags: (taskId: string, tags: TaskTag[]) => void;
  completeRecurringTask: (taskId: string) => ProgressResult | null;
  refreshRecurringTasks: () => void;
  addTaskTodo: (taskId: string, title: string) => string | null;
  reorderTaskTodo: (taskId: string, todoId: string, targetTodoId: string) => void;
  toggleTaskTodo: (taskId: string, todoId: string) => ProgressResult | null;
  progressTask: (taskId: string, options?: string | ProgressTaskOptions, todo?: QuestTodoItem) => ProgressResult | null;
  addProgressTag: (name: string, colorId?: ProgressTagColorId) => string | null;
  updateProgressTag: (tagId: string, updates: { name?: string; colorId?: ProgressTagColorId }) => boolean;
  deleteProgressTag: (tagId: string) => void;
  useScroll: (className: ClassName) => { lineId: string; isNew: boolean; upgraded: boolean; fromTier: number; toTier: number } | null;
  startShortRest: () => void;
  startLongRest: () => void;
  completeRest: () => void;
  cancelRest: () => void;
  chooseFeat: (choiceId: string, featId: string) => boolean;
  getBackupData: () => QuestBackup;
  exportData: () => void;
  importData: (jsonString: string, options?: { markSyncedAt?: string }) => boolean;
  undoLastAction: () => boolean;
  clearUndo: () => void;
  clearAll: () => void;
  markSynced: (syncedAt: string) => void;
};

type QuestStore = QuestStoreState;

const createUndoEntry = (state: QuestStoreState, label: string): UndoEntry => ({
  label,
  createdAt: new Date().toISOString(),
  snapshot: {
    tasks: state.tasks,
    logs: state.logs,
    focusTaskId: state.focusTaskId,
    totalXp: state.totalXp,
    streak: state.streak,
    momentumTaskId: state.momentumTaskId,
    momentumCount: state.momentumCount,
    classStates: state.classStates,
    lastProgressDate: state.lastProgressDate,
    dataUpdatedAt: state.dataUpdatedAt,
    lastSyncedAt: state.lastSyncedAt,
    lastProgressClass: state.lastProgressClass,
    restState: state.restState,
    discoveredResonances: state.discoveredResonances,
    resonanceBuffs: state.resonanceBuffs,
    resonanceChain: state.resonanceChain,
    featState: state.featState,
    progressTags: state.progressTags,
  },
});

// ─── Store ───

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      tasks: [], logs: [], focusTaskId: undefined, totalXp: 0, streak: { count: 0 },
      momentumTaskId: undefined, momentumCount: 0, classStates: initClassState(),
      lastProgressDate: undefined, dataUpdatedAt: undefined, lastSyncedAt: undefined,
      lastProgressClass: undefined, restState: undefined, discoveredResonances: {},
      resonanceBuffs: createInitialResonanceBuffs(), resonanceChain: { count: 0 },
      featState: createInitialFeatState(), progressTags: [], lastUndo: undefined,

      addTask: (rawTitle, className = "Wizard", tags = []) => {
        const title = rawTitle.trim();
        if (!title) return null;
        const normalizedTags = tags.filter(isTaskTag).filter((tag, i, arr) => arr.indexOf(tag) === i);
        const now = new Date().toISOString();
        const task: QuestTask = { id: makeId(), title, progressCount: 0, status: "active", className, tags: normalizedTags, todos: [], createdAt: now, updatedAt: now, lastFocusedAt: now };
        set((s) => ({ tasks: [task, ...s.tasks], focusTaskId: s.focusTaskId ?? task.id, dataUpdatedAt: now }));
        return task.id;
      },

      setFocusTask: (taskId) => {
        const now = new Date().toISOString();
        set((s) => (s.tasks.find((t) => t.id === taskId) ? { focusTaskId: taskId, dataUpdatedAt: now } : s));
      },

      updateTaskStatus: (taskId, status) => {
        const now = new Date().toISOString();
        set((s) => {
          const next = s.tasks.map((t) => t.id === taskId ? { ...t, status, updatedAt: now } : t);
          const nextFocus = s.focusTaskId === taskId && status === "archived" ? next.find((t) => t.status === "active")?.id : s.focusTaskId;
          return { tasks: next, focusTaskId: nextFocus, dataUpdatedAt: now };
        });
      },

      updateTaskTags: (taskId, tags) => {
        const now = new Date().toISOString();
        const normalized = tags.filter(isTaskTag).filter((tag, i, arr) => arr.indexOf(tag) === i);
        let changed = false;
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            changed = true;
            const freq = getRecurringFrequency(normalized);
            const keep = freq && getRecurringFrequency(t.tags) === freq;
            return { ...t, tags: normalized, recurringCompletedAt: keep ? t.recurringCompletedAt : undefined, recurringCompletedKey: keep ? t.recurringCompletedKey : undefined, updatedAt: now };
          }),
          dataUpdatedAt: changed ? now : s.dataUpdatedAt
        }));
      },

      completeRecurringTask: (taskId) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task || task.status === "archived") return null;
        const freq = getRecurringFrequency(task.tags);
        if (!freq) return null;

        const result = get().progressTask(taskId, freq === "daily" ? "完成今日" : "完成本周");
        if (!result) return null;

        const completedAt = result.at;
        const completedKey = getRecurringKey(new Date(completedAt), freq);
        const ns = get();
        const next = ns.tasks.map((t) => t.id === taskId ? { ...t, status: "archived" as QuestStatus, recurringCompletedAt: completedAt, recurringCompletedKey: completedKey, updatedAt: completedAt } : t);
        const nextFocus = ns.focusTaskId === taskId ? next.find((t) => t.status === "active")?.id : ns.focusTaskId;
        set({ tasks: next, focusTaskId: nextFocus, dataUpdatedAt: completedAt });
        return result;
      },

      refreshRecurringTasks: () => {
        const nowDate = new Date();
        const now = nowDate.toISOString();
        // Deduplicate: skip if last refresh was within 30s
        if (Date.now() - _lastRefreshRecurringAt < 30000) return;

        let changed = false;
        set((state) => {
          const next = state.tasks.map((t) => {
            const freq = getRecurringFrequency(t.tags);
            if (!freq || t.status !== "archived") return t;
            if (t.recurringCompletedKey === getRecurringKey(nowDate, freq)) return t;
            changed = true;
            return { ...t, status: "active" as QuestStatus, recurringCompletedAt: undefined, recurringCompletedKey: undefined, updatedAt: now };
          });
          return changed ? { tasks: next, dataUpdatedAt: now } : state;
        });
        _lastRefreshRecurringAt = Date.now();
      },

      addTaskTodo: (taskId, rawTitle) => {
        const title = rawTitle.trim();
        if (!title) return null;
        const now = new Date().toISOString();
        const todo: QuestTodoItem = { id: makeId(), title, createdAt: now };
        let created = false;
        set((s) => ({
          tasks: s.tasks.map((t) => { if (t.id !== taskId) return t; created = true; return { ...t, todos: [todo, ...t.todos], updatedAt: now }; }),
          dataUpdatedAt: created ? now : s.dataUpdatedAt
        }));
        return created ? todo.id : null;
      },

      reorderTaskTodo: (taskId, todoId, targetTodoId) => {
        if (todoId === targetTodoId) return;
        const now = new Date().toISOString();
        let changed = false;
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const fi = t.todos.findIndex((td) => td.id === todoId);
            const ti = t.todos.findIndex((td) => td.id === targetTodoId);
            if (fi < 0 || ti < 0) return t;
            const nt = [...t.todos]; const [mv] = nt.splice(fi, 1); nt.splice(ti, 0, mv);
            changed = true; return { ...t, todos: nt, updatedAt: now };
          }),
          dataUpdatedAt: changed ? now : s.dataUpdatedAt
        }));
      },

      toggleTaskTodo: (taskId, todoId) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === taskId);
        const todo = task?.todos.find((t) => t.id === todoId);
        if (!task || !todo) return null;
        if (!todo.completedAt) return get().progressTask(taskId, { note: todo.title, todo });
        const now = new Date().toISOString();
        set({ tasks: s.tasks.map((t) => t.id === taskId ? { ...t, todos: t.todos.map((c) => c.id === todoId ? { ...c, completedAt: undefined } : c), updatedAt: now } : t), dataUpdatedAt: now });
        return null;
      },

      progressTask: (taskId, options, legacyTodo) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task || task.status === "archived") return null;
        const opts: ProgressTaskOptions = typeof options === "string" ? { note: options, todo: legacyTodo } : options ?? {};
        const selectedTags = (opts.progressTagIds ?? []).reduce<ProgressTagSnapshot[]>((items, tid) => {
          if (items.some((i) => i.id === tid)) return items;
          const tg = s.progressTags.find((t) => t.id === tid);
          if (tg) items.push({ id: tg.id, name: tg.name, colorId: tg.colorId });
          return items;
        }, []);

        const now = new Date();
        const at = now.toISOString();
        const progressCount = task.progressCount + 1;
        const taskClassName = isClassName(task.className) ? task.className : "Wizard";
        const fatigueBefore = s.classStates[taskClassName].fatigue;

        const synergyActive = !!s.lastProgressClass && s.lastProgressClass !== taskClassName;
        const resDef = synergyActive && s.lastProgressClass ? RESONANCE_MAP[getResonanceKey(s.lastProgressClass, taskClassName)] : undefined;
        const prevDiscovery = resDef ? s.discoveredResonances[resDef.key] : undefined;
        const resonance: ResonanceTrigger | undefined = resDef ? {
          key: resDef.key, name: resDef.name, classes: resDef.classes, reward: resDef.reward, description: resDef.description,
          discoveredAt: prevDiscovery?.discoveredAt ?? at, triggerCount: (prevDiscovery?.triggerCount ?? 0) + 1,
          level: getResonanceLevel((prevDiscovery?.triggerCount ?? 0) + 1),
          previousLevel: getResonanceLevel(prevDiscovery?.triggerCount ?? 0),
          leveledUp: getResonanceLevel((prevDiscovery?.triggerCount ?? 0) + 1) > getResonanceLevel(prevDiscovery?.triggerCount ?? 0),
          chainCount: s.resonanceChain.lastClass && s.resonanceChain.lastClass !== taskClassName ? s.resonanceChain.count + 1 : 1,
          chainBonus: s.resonanceChain.lastClass && s.resonanceChain.lastClass !== taskClassName ? s.resonanceChain.count + 1 >= 5 : false,
          isNew: !prevDiscovery
        } : undefined;

        const momentum = s.momentumTaskId === taskId ? s.momentumCount + 1 : 1;
        const nextBuffs = { ...s.resonanceBuffs };
        const currentFeatState = refreshPendingFeatChoices(s.classStates, normalizeFeatState(s.featState), at);
        const today = getLocalDayKey(now);
        const dailyAdv = hasFeat(currentFeatState, "fate-dice", taskClassName) && currentFeatState.dailyAdvantageUsedAt !== today;
        const existingDouble = nextBuffs.doubleScrolls;
        const forceAdv = nextBuffs.advantageChecks > 0 || dailyAdv;
        const critChance = (nextBuffs.luckyChecks > 0 ? 0.05 : 0) + (hasFeat(currentFeatState, "lucky-one", taskClassName) ? 0.03 : 0);

        let skillCheck;
        if (Math.random() < 0.5) {
          const cl = getClassLevel(s.classStates[taskClassName].xp);
          skillCheck = rollSkillCheck(taskClassName, cl, { forceAdvantage: forceAdv, criticalBonusChance: critChance });
          if (hasFeat(currentFeatState, "chosen-one", taskClassName)) skillCheck = { ...skillCheck, modifier: skillCheck.modifier + 1, success: skillCheck.success || skillCheck.roll + skillCheck.modifier + 1 >= skillCheck.dc };
          if (!skillCheck.success && hasFeat(currentFeatState, "favored-by-fate", taskClassName) && Math.random() < 0.1) skillCheck = rollSkillCheck(taskClassName, cl, { forceAdvantage: forceAdv, criticalBonusChance: critChance });
          if (dailyAdv) currentFeatState.dailyAdvantageUsedAt = today;
          if (nextBuffs.advantageChecks > 0) nextBuffs.advantageChecks = Math.max(0, nextBuffs.advantageChecks - 1);
          if (nextBuffs.luckyChecks > 0) nextBuffs.luckyChecks = Math.max(0, nextBuffs.luckyChecks - 1);
        }

        const fatigueLimit = hasFeat(currentFeatState, "energy-manager", taskClassName) ? 120 : 100;
        const reward = calculateProgressReward({ previousProgressCount: task.progressCount, progressCount, tags: task.tags ?? [], fatigueBefore, momentum, resonanceRewardType: resonance?.reward.type, resonanceChainBonus: resonance?.chainBonus, skillCheck, doubleScrollBuffs: existingDouble, fatigueMultiplierOverride: hasFeat(currentFeatState, "iron-will", taskClassName) && fatigueBefore > 80 ? 1 : undefined, fatigueLimit });
        if (reward.consumedDoubleScroll) nextBuffs.doubleScrolls = Math.max(0, nextBuffs.doubleScrolls - 1);

        const rBonuses = { xp: 0, scrolls: 0, fatigueRecovery: 0 };
        if (resonance?.reward.type === "advantage") nextBuffs.advantageChecks += 1;
        if (resonance?.reward.type === "lucky") nextBuffs.luckyChecks += 1;
        if (resonance?.reward.type === "doubleScroll") nextBuffs.doubleScrolls += 1;
        if (resonance?.reward.type === "longRestScroll") nextBuffs.longRestScrolls += 1;
        if (resonance && hasFeat(currentFeatState, "resonance-core", taskClassName)) addResonanceReward(resonance.reward.type, nextBuffs, rBonuses);
        if (resonance && hasFeat(currentFeatState, "linkage-expert", taskClassName) && Math.random() < 0.1) addResonanceReward(resonance.reward.type, nextBuffs, rBonuses);
        if (rBonuses.fatigueRecovery > 0) reward.finalFatigueAfter = Math.max(0, reward.finalFatigueAfter - rBonuses.fatigueRecovery);
        if (hasFeat(currentFeatState, "perpetual-motion", taskClassName)) { reward.fatigueAfterProgress = Math.min(80, reward.fatigueAfterProgress); reward.finalFatigueAfter = Math.min(80, reward.finalFatigueAfter); }

        let featXp = rBonuses.xp, featClassXp = 0, featScrolls = rBonuses.scrolls;
        if (hasFeat(currentFeatState, "diligent-scholar", taskClassName)) { featXp += 1; featClassXp += 1; }
        if (hasFeat(currentFeatState, "deep-thinking", taskClassName) && task.tags.includes("important")) featXp += 2;
        if (hasFeat(currentFeatState, "specialist", taskClassName) && momentum >= 3) featXp += 3;
        if (hasFeat(currentFeatState, "target-lock", taskClassName) && momentum >= 2) featXp += Math.min(10, momentum - 1);
        if (hasFeat(currentFeatState, "class-switcher", taskClassName) && synergyActive) featXp += 3;
        if (hasFeat(currentFeatState, "rapid-learning", taskClassName) && task.progressCount < 10) featClassXp += Math.round(reward.classXpAwarded * 0.5);
        if (hasFeat(currentFeatState, "school-master", taskClassName) && getClassLevel(s.classStates[taskClassName].xp) >= 20) featClassXp += Math.round(reward.classXpAwarded * 0.2);
        if (hasFeat(currentFeatState, "grand-library", taskClassName)) featClassXp += Math.max(1, Math.round(reward.classXpAwarded * 0.1));
        if (hasFeat(currentFeatState, "eidetic-memory", taskClassName) && skillCheck?.scrollEarned && Math.random() < 0.1) featScrolls += 1;
        if (hasFeat(currentFeatState, "golden-hand", taskClassName) && reward.scrollsAwarded > 0 && Math.random() < 0.1) featScrolls += 1;
        if (hasFeat(currentFeatState, "fate-weaver", taskClassName) && skillCheck?.critical) { featClassXp += skillCheck.xpBonus; featScrolls += skillCheck.scrollCount; }
        if (hasFeat(currentFeatState, "long-hauler", taskClassName) && task.tags.includes("important")) featScrolls += 1;
        if (hasFeat(currentFeatState, "legendary-crafter", taskClassName) && momentum >= 10) featScrolls += 1;
        if (hasFeat(currentFeatState, "resonance-master", taskClassName) && resonance?.isNew) featScrolls += hasFeat(currentFeatState, "omnicollector", taskClassName) ? 2 : 1;
        if (hasFeat(currentFeatState, "archaeologist", taskClassName) && reward.newRegion) featScrolls += hasFeat(currentFeatState, "omnicollector", taskClassName) ? 2 : 1;
        if (resonance && hasFeat(currentFeatState, "social-adept", taskClassName)) featXp += 1;
        if (hasFeat(currentFeatState, "self-recovery", taskClassName) && s.lastProgressDate !== today) reward.finalFatigueAfter = Math.max(0, reward.finalFatigueAfter - 5);
        if (synergyActive && hasFeat(currentFeatState, "party-coordinator", taskClassName)) reward.finalFatigueAfter = Math.max(0, reward.finalFatigueAfter - 5);
        if (hasFeat(currentFeatState, "deep-work", taskClassName) && s.focusTaskId === taskId) reward.finalFatigueAfter = Math.max(fatigueBefore, reward.finalFatigueAfter - 2);
        reward.finalFatigueAfter = Math.min(fatigueLimit, reward.finalFatigueAfter);

        const totalBaseXp = reward.baseXp + featXp;
        const totalClassXp = reward.classXpAwarded + featClassXp;
        const totalScrolls = reward.scrollsAwarded + featScrolls;
        const nextStreakSt = nextStreak(s.streak, now);
        const firstOfDay = s.lastProgressDate !== today;
        const completedTodo = opts.todo;
        const note = opts.note?.trim() || selectedTags.map((tg) => tg.name).join(" · ") || "推进一步";

        const log: ProgressLog = {
          id: makeId(), type: "progress", taskId, className: taskClassName, note, at,
          xpAwarded: totalBaseXp, classXpAwarded: totalClassXp, progressCount, skillCheck,
          scrollEarned: totalScrolls > 0 ? (skillCheck?.scrollType ?? resonance?.reward.label ?? CLASS_META[taskClassName].scrollName) : undefined,
          scrollCount: totalScrolls > 0 ? totalScrolls : undefined,
          fatigueBefore, fatigueAfter: reward.finalFatigueAfter, synergyBonus: synergyActive,
          resonanceKey: resonance?.key, resonanceName: resonance?.name, resonanceReward: resonance?.reward.label,
          todoId: completedTodo?.id, todoTitle: completedTodo?.title, progressTags: selectedTags
        };

        const updatedClassStates = { ...s.classStates };
        updatedClassStates[taskClassName] = { ...updatedClassStates[taskClassName], xp: updatedClassStates[taskClassName].xp + totalClassXp, scrolls: updatedClassStates[taskClassName].scrolls + totalScrolls, fatigue: reward.finalFatigueAfter };
        const nextFeatState = refreshPendingFeatChoices(updatedClassStates, currentFeatState, at);

        const updatedDiscoveries = resonance ? { ...s.discoveredResonances, [resonance.key]: { key: resonance.key, discoveredAt: resonance.discoveredAt, triggerCount: resonance.triggerCount } } : s.discoveredResonances;

        const updatedTask: QuestTask = { ...task, className: taskClassName, status: task.status === "paused" ? "active" : task.status, progressCount, todos: completedTodo ? task.todos.map((td) => td.id === completedTodo.id ? { ...td, completedAt: at } : td) : task.todos, updatedAt: at, lastFocusedAt: at };

        set({ tasks: [...s.tasks.filter((t) => t.id !== taskId), updatedTask], logs: [log, ...s.logs], focusTaskId: taskId, totalXp: s.totalXp + totalBaseXp, streak: nextStreakSt, momentumTaskId: taskId, momentumCount: momentum, classStates: updatedClassStates, lastProgressDate: firstOfDay ? today : s.lastProgressDate, lastProgressClass: taskClassName, discoveredResonances: updatedDiscoveries, resonanceBuffs: nextBuffs, resonanceChain: { count: resonance?.chainCount ?? 0, lastClass: taskClassName }, featState: nextFeatState, dataUpdatedAt: at, lastUndo: createUndoEntry(s, `撤销推进：${task.title}`) });

        return { taskId, taskTitle: task.title, className: taskClassName, progressCount, xpAwarded: totalBaseXp, classXpAwarded: totalClassXp, momentum, milestone: reward.milestone, newRegion: reward.newRegion, streak: nextStreakSt.count, firstOfDay, skillCheck, scrollEarned: totalScrolls > 0 ? (skillCheck?.scrollType ?? resonance?.reward.label ?? CLASS_META[taskClassName].scrollName) : undefined, scrollCount: totalScrolls > 0 ? totalScrolls : undefined, fatigueBefore, fatigueAfter: reward.finalFatigueAfter, synergyBonus: synergyActive, resonance, at };
      },

      addProgressTag: (rawName, colorId = DEFAULT_PROGRESS_TAG_COLOR) => {
        const name = rawName.trim();
        if (!name) return null;
        const now = new Date().toISOString();
        const tag: ProgressTag = { id: makeId(), name, colorId: isProgressTagColorId(colorId) ? colorId : DEFAULT_PROGRESS_TAG_COLOR, createdAt: now, updatedAt: now };
        set((s) => ({ progressTags: [tag, ...s.progressTags], dataUpdatedAt: now }));
        return tag.id;
      },

      updateProgressTag: (tagId, updates) => {
        const name = updates.name?.trim();
        const now = new Date().toISOString();
        let changed = false;
        set((s) => ({
          progressTags: s.progressTags.map((t) => { if (t.id !== tagId) return t; changed = true; return { ...t, name: name || t.name, colorId: isProgressTagColorId(updates.colorId) ? updates.colorId : t.colorId, updatedAt: now }; }),
          dataUpdatedAt: changed ? now : s.dataUpdatedAt
        }));
        return changed;
      },

      deleteProgressTag: (tagId) => {
        const now = new Date().toISOString();
        let changed = false;
        set((s) => ({ progressTags: s.progressTags.filter((t) => { if (t.id !== tagId) return true; changed = true; return false; }), dataUpdatedAt: changed ? now : s.dataUpdatedAt }));
      },

      useScroll: (className) => {
        const s = get();
        const cs = s.classStates[className];
        if (cs.scrolls <= 0) return null;
        const result = learnSkillFromScroll(className, cs.skills);
        if (!result) return null;
        const line = getLineById(result.lineId);
        if (!line) return null;

        const updatedSkills = [...cs.skills];
        const idx = updatedSkills.findIndex((sk) => sk.lineId === result.lineId);
        if (idx >= 0) { const ex = updatedSkills[idx]; const nc = ex.copies + 1; updatedSkills[idx] = { ...ex, copies: nc, currentTier: getTierFromCopies(nc) }; }
        else updatedSkills.push({ lineId: result.lineId, copies: 1, currentTier: 1 });

        const now = new Date().toISOString();
        const skillName = getSkillNameAtTier(line, result.toTier);
        const log: ProgressLog = { id: makeId(), type: "scroll", taskId: "scroll", className, note: result.isNew ? `使用${CLASS_META[className].scrollName}习得 ${skillName}` : result.upgraded ? `使用${CLASS_META[className].scrollName}将 ${line.name} 升至 ${result.toTier} 环` : `使用${CLASS_META[className].scrollName}强化 ${line.name}`, at: now, xpAwarded: 0, classXpAwarded: 0, progressCount: 0, scrollEarned: CLASS_META[className].scrollName, scrollCount: -1, newSkill: result.isNew ? skillName : undefined, skillUpgrade: result.upgraded ? { name: skillName, fromTier: result.fromTier, toTier: result.toTier, className } : undefined };

        const currentFeatState = normalizeFeatState(s.featState);
        const featClassXp = result.isNew && hasFeat(currentFeatState, "collector", className) ? 5 : result.upgraded && hasFeat(currentFeatState, "skill-fanatic", className) ? 8 : 0;
        const featScrollBonus = result.isNew && hasFeat(currentFeatState, "codex-hunter", className) ? 1 : result.upgraded && hasFeat(currentFeatState, "treasure-hunter", className) && result.toTier >= 4 && Math.random() < 0.25 ? 1 : 0;
        const updatedState = { ...cs, xp: cs.xp + featClassXp, scrolls: cs.scrolls - 1 + featScrollBonus, skills: updatedSkills };

        set({ logs: [log, ...s.logs], classStates: { ...s.classStates, [className]: updatedState }, featState: refreshPendingFeatChoices({ ...s.classStates, [className]: updatedState }, currentFeatState, now), dataUpdatedAt: now });
        return result;
      },

      getBackupData: () => createBackupData(get()),
      exportData: () => downloadBackup(createBackupData(get())),

      importData: (jsonString, options) => {
        try {
          const data = JSON.parse(jsonString);
          if (!data.tasks) return false;
          // Reject data with future timestamps (>5 min buffer) to prevent malicious / broken imports
          const now = new Date().toISOString();
          const nowTs = Date.now();
          const futureBuffer = 5 * 60 * 1000; // 5 min clock skew tolerance
          const importedUpdatedAt = data.updatedAt ?? data.exportedAt ?? now;
          if (new Date(importedUpdatedAt).getTime() > nowTs + futureBuffer) return false;
          const tasks = normalizeTasks(data.tasks);
          const classStates = normalizeClassStates(data.classStates);
          snapshotCurrentLocalState();
          const previous = get();
          set({ tasks, logs: normalizeLogs(data.logs, tasks), focusTaskId: typeof data.focusTaskId === "string" ? data.focusTaskId : undefined, totalXp: typeof data.totalXp === "number" ? data.totalXp : 0, streak: data.streak && typeof data.streak === "object" ? { count: Math.max(0, Math.floor(Number((data.streak as { count?: unknown }).count) || 0)), lastProgressDate: typeof (data.streak as { lastProgressDate?: unknown }).lastProgressDate === "string" ? (data.streak as { lastProgressDate: string }).lastProgressDate : undefined } : { count: 0 }, momentumTaskId: typeof data.momentumTaskId === "string" ? data.momentumTaskId : undefined, momentumCount: typeof data.momentumCount === "number" ? data.momentumCount : 0, classStates, lastProgressDate: typeof data.lastProgressDate === "string" ? data.lastProgressDate : undefined, dataUpdatedAt: importedUpdatedAt, lastSyncedAt: options?.markSyncedAt ?? (typeof data.lastSyncedAt === "string" ? data.lastSyncedAt : undefined), lastProgressClass: isClassName(data.lastProgressClass) ? data.lastProgressClass : undefined, discoveredResonances: data.discoveredResonances && typeof data.discoveredResonances === "object" ? data.discoveredResonances as QuestStore["discoveredResonances"] : {}, resonanceBuffs: data.resonanceBuffs && typeof data.resonanceBuffs === "object" ? data.resonanceBuffs as ResonanceBuffs : createInitialResonanceBuffs(), resonanceChain: data.resonanceChain && typeof data.resonanceChain === "object" ? data.resonanceChain as ResonanceChainState : { count: 0 }, featState: refreshPendingFeatChoices(classStates, normalizeFeatState(data.featState), now), progressTags: normalizeProgressTags(data.progressTags), lastUndo: createUndoEntry(previous, "撤销导入覆盖") });
          return true;
        } catch { return false; }
      },

      undoLastAction: () => {
        const undo = get().lastUndo;
        if (!undo) return false;
        set({ ...undo.snapshot, dataUpdatedAt: new Date().toISOString(), lastUndo: undefined });
        return true;
      },

      clearUndo: () => set({ lastUndo: undefined }),

      clearAll: () => {
        const now = new Date().toISOString();
        set({ tasks: [], logs: [], focusTaskId: undefined, totalXp: 0, streak: { count: 0 }, momentumTaskId: undefined, momentumCount: 0, classStates: initClassState(), lastProgressDate: undefined, dataUpdatedAt: now, lastSyncedAt: undefined, lastProgressClass: undefined, restState: undefined, discoveredResonances: {}, resonanceBuffs: createInitialResonanceBuffs(), resonanceChain: { count: 0 }, featState: createInitialFeatState(), progressTags: [], lastUndo: undefined });
      },

      startShortRest: () => { if (get().restState) return; const now = new Date(); set({ restState: { type: "short", startedAt: now.toISOString(), endsAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString() }, dataUpdatedAt: now.toISOString() }); },
      startLongRest: () => { if (get().restState) return; const now = new Date(); set({ restState: { type: "long", startedAt: now.toISOString(), endsAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString() }, dataUpdatedAt: now.toISOString() }); },

      completeRest: () => {
        const s = get();
        if (!s.restState) return;
        const updated = { ...s.classStates };
        if (s.restState.type === "short") {
          const recovery = hasFeat(s.featState, "nap") ? Math.round(SHORT_REST_RECOVERY * 1.1) : SHORT_REST_RECOVERY;
          for (const cn of classNames) updated[cn] = { ...updated[cn], fatigue: Math.max(0, updated[cn].fatigue - recovery) };
        } else {
          for (const cn of classNames) updated[cn] = { ...updated[cn], fatigue: 0 };
          if (s.resonanceBuffs.longRestScrolls > 0) { const tc = s.lastProgressClass ?? "Wizard"; updated[tc] = { ...updated[tc], scrolls: updated[tc].scrolls + s.resonanceBuffs.longRestScrolls }; }
        }
        const nextBuffs = s.restState.type === "long" ? { ...s.resonanceBuffs, longRestScrolls: 0 } : s.resonanceBuffs;
        const currentFeat = normalizeFeatState(s.featState);
        const tc = s.lastProgressClass ?? "Wizard";
        if (s.restState.type === "long" && hasFeat(currentFeat, "deep-sleep")) updated[tc] = { ...updated[tc], scrolls: updated[tc].scrolls + 1 };
        if (hasFeat(currentFeat, "meditator")) updated[tc] = { ...updated[tc], xp: updated[tc].xp + (s.restState.type === "long" ? 20 : 8) };
        const nextFeat = { ...currentFeat, shortRestCount: currentFeat.shortRestCount + (s.restState.type === "short" ? 1 : 0), longRestCount: currentFeat.longRestCount + (s.restState.type === "long" ? 1 : 0) };
        const now = new Date().toISOString();
        set({ classStates: updated, restState: undefined, resonanceBuffs: nextBuffs, resonanceChain: s.restState.type === "long" ? { count: 0 } : s.resonanceChain, featState: refreshPendingFeatChoices(updated, nextFeat, now), dataUpdatedAt: now });
      },

      cancelRest: () => set({ restState: undefined, dataUpdatedAt: new Date().toISOString() }),

      chooseFeat: (choiceId, featId) => {
        const s = get();
        const current = normalizeFeatState(s.featState);
        const choice = current.pending.find((c) => c.id === choiceId);
        if (!choice || !choice.choices.includes(featId) || !FEAT_MAP[featId] || current.owned.some((f) => f.id === featId)) return false;
        const now = new Date().toISOString();
        const nextFeat = { ...current, owned: [...current.owned, { id: featId, className: choice.className, selectedAt: now, level: choice.level }], pending: current.pending.filter((c) => c.id !== choiceId) };
        set({ featState: refreshPendingFeatChoices(s.classStates, nextFeat, now), dataUpdatedAt: now, lastUndo: createUndoEntry(s, "撤销专长选择") });
        return true;
      },

      markSynced: (syncedAt) => set({ lastSyncedAt: syncedAt }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(localStorageProvider),
      version: QUESTFLOW_BACKUP_VERSION,
      partialize: (state) => {
        const { lastUndo, ...persisted } = state;
        return persisted;
      },
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        let data = persisted;

        if (version < 3) data = { ...persisted, totalXp: persisted.xp ?? 0, classStates: initClassState(), lastProgressDate: undefined };
        if (version < 4 && data.classStates) {
          const cs = data.classStates as Record<string, { skills: import("@/data/classes").OwnedSkill[] }>;
          for (const key of Object.keys(cs)) cs[key].skills = cs[key].skills.map((s) => ({ ...s, currentTier: getTierFromCopies(s.copies) }));
        }
        if (version < 5 && data.classStates) { const cs = data.classStates as Record<string, { skills: unknown[]; scrolls: number }>; for (const key of Object.keys(cs)) cs[key].skills = []; }
        if (version < 6) {
          const tasks = (data.tasks as Array<{ updatedAt?: string }> | undefined) ?? [];
          const logs = (data.logs as Array<{ at?: string }> | undefined) ?? [];
          data = { ...data, tasks: normalizeTasks(data.tasks), dataUpdatedAt: ([data.dataUpdatedAt, ...tasks.map((t) => t.updatedAt), ...logs.map((l) => l.at)].filter(Boolean) as string[]).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? undefined, lastSyncedAt: data.lastSyncedAt };
        }
        if (version < 7) {
          if (data.classStates) { const cs = data.classStates as Record<string, { fatigue?: number; skills: unknown[]; scrolls: number; xp: number }>; for (const key of Object.keys(cs)) if (typeof cs[key].fatigue !== "number") cs[key].fatigue = 0; }
          if (data.tasks) data.tasks = normalizeTasks(data.tasks);
          data = { ...data, lastProgressClass: data.lastProgressClass ?? undefined, restState: undefined };
        }
        if (version < 8 && data.classStates) { const cs = data.classStates as Record<string, unknown>; for (const cn of ["Paladin", "Ranger", "Druid", "Warlock", "Sorcerer", "Monk", "Barbarian"]) if (!cs[cn]) cs[cn] = { xp: 0, scrolls: 0, skills: [], fatigue: 0 }; }
        if (version < 9) data = { ...data, discoveredResonances: data.discoveredResonances ?? {}, resonanceBuffs: data.resonanceBuffs ?? createInitialResonanceBuffs() };
        if (version < 10) data = { ...data, resonanceChain: data.resonanceChain ?? { count: 0 } };
        if (version < 11) { const tasks = normalizeTasks(data.tasks); data = { ...data, tasks, logs: normalizeLogs(data.logs, tasks) }; }
        if (version < 12) { const tasks = normalizeTasks(data.tasks); data = { ...data, tasks, logs: normalizeLogs(data.logs, tasks) }; }
        if (version < 13) { const classStates = normalizeClassStates(data.classStates); data = { ...data, classStates, featState: refreshPendingFeatChoices(classStates, normalizeFeatState(data.featState), new Date().toISOString()) }; }
        if (version < 14) { const tasks = normalizeTasks(data.tasks); data = { ...data, tasks, logs: normalizeLogs(data.logs, tasks), progressTags: normalizeProgressTags(data.progressTags) }; }
        if (version < 15) { const tasks = normalizeTasks(data.tasks); data = { ...data, tasks, logs: normalizeLogs(data.logs, tasks) }; }

        return data;
      }
    }
  )
);
