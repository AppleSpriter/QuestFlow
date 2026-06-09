"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cloud,
  Coffee,
  Flame,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Tags,
  Target,
  Tent,
  Trophy
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  getLevelProgress,
  type ProgressLog,
  type ProgressResult,
  type ProgressTag,
  type QuestStatus,
  type QuestTask,
  type LongRestSummary,
  useQuestStore
} from "@/lib/quest-store";
import {
  type ClassName,
  type TaskTag,
  ALL_CLASSES,
  CLASS_META,
  TAG_META,
  getClassLevel,
  getFatigueStage,
  FATIGUE_STAGE_META,
  SHORT_REST_MINUTES,
  LONG_REST_MINUTES
} from "@/data/classes";
import {
  FEAT_FLOW_META,
  getNextFeatLevel,
  getOwnedFeatsForClass,
  getPrimaryFeatFlow,
  type PendingFeatChoice
} from "@/data/feats";
import type { ResonanceTrigger } from "@/data/resonance";
import { SkillCheckToast, type SkillCheckInfo } from "@/components/SkillCheckToast";
import { FocusPanel } from "@/components/FocusPanel";
import { QuestCard } from "@/components/QuestCard";
import { FocusTodoPanel } from "@/components/FocusTodoPanel";
import { ProgressLogPanel } from "@/components/ProgressLogPanel";
import {
  FocusChangedOverlay,
  QuestCreatedOverlay,
  MilestoneOverlay,
  NormalResonanceEffect,
  FeatChoiceModal,
} from "@/components/Overlays";

const Spellbook = dynamic(() => import("@/components/Spellbook").then((mod) => mod.Spellbook), { ssr: false });
const NewResonanceModal = dynamic(() => import("@/components/Overlays").then((mod) => mod.NewResonanceModal), { ssr: false });
const LongRestSummaryModal = dynamic(() => import("@/components/Overlays").then((mod) => mod.LongRestSummaryModal), { ssr: false });

const statusTabs: Array<{ id: QuestStatus; label: string }> = [
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "archived", label: "Archived" }
];

const classStyles: Record<ClassName, string> = {
  Wizard: "border-violet-200 bg-violet-50 text-violet-800",
  Fighter: "border-red-200 bg-red-50 text-red-800",
  Rogue: "border-slate-200 bg-slate-50 text-slate-800",
  Bard: "border-amber-200 bg-amber-50 text-amber-800",
  Cleric: "border-sky-200 bg-sky-50 text-sky-800",
  Paladin: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Ranger: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Druid: "border-lime-200 bg-lime-50 text-lime-800",
  Warlock: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  Sorcerer: "border-orange-200 bg-orange-50 text-orange-800",
  Monk: "border-teal-200 bg-teal-50 text-teal-800",
  Barbarian: "border-stone-200 bg-stone-50 text-stone-800"
};

const getTaskClass = (task: Pick<QuestTask, "className">): ClassName =>
  task.className && CLASS_META[task.className] ? task.className : "Wizard";

const regionBackgrounds: Record<string, string> = {
  camp: "linear-gradient(180deg, #faf9f7 0%, #f0ece6 50%, #e8e2d8 100%)",
  trail: "linear-gradient(180deg, #fff7ed 0%, #fed7aa 50%, #fdba74 100%)",
  forest: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
  ruins: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
  canyon: "linear-gradient(180deg, #fef2f2 0%, #fecaca 50%, #fca5a5 100%)",
  swamp: "linear-gradient(180deg, #ecfeff 0%, #ccfbf1 50%, #99f6e4 100%)",
  tower: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
  library: "linear-gradient(180deg, #f5f3ff 0%, #ddd6fe 50%, #c4b5fd 100%)",
  forge: "linear-gradient(180deg, #fff7ed 0%, #fed7aa 45%, #fb923c 100%)",
  citadel: "linear-gradient(180deg, #fefce8 0%, #fef08a 50%, #fde047 100%)",
  abyss: "linear-gradient(180deg, #f1f5f9 0%, #94a3b8 50%, #334155 100%)",
  astral: "linear-gradient(180deg, #eef2ff 0%, #c7d2fe 50%, #818cf8 100%)",
  lab: "linear-gradient(180deg, #f0f9ff 0%, #bae6fd 50%, #38bdf8 100%)",
  throne: "linear-gradient(180deg, #fff1f2 0%, #fecdd3 50%, #fda4af 100%)",
  legend: "linear-gradient(180deg, #faf5ff 0%, #e9d5ff 45%, #a855f7 100%)"
};

const darkRegionBackgrounds: Record<string, string> = {
  camp: "radial-gradient(circle at 20% 0%, rgba(148, 163, 184, 0.18), transparent 32%), linear-gradient(180deg, #0f172a 0%, #111827 48%, #020617 100%)",
  trail: "radial-gradient(circle at 20% 0%, rgba(249, 115, 22, 0.18), transparent 34%), linear-gradient(180deg, #1c1917 0%, #0f172a 55%, #020617 100%)",
  forest: "radial-gradient(circle at 20% 0%, rgba(34, 197, 94, 0.18), transparent 34%), linear-gradient(180deg, #052e16 0%, #0f172a 58%, #020617 100%)",
  ruins: "radial-gradient(circle at 20% 0%, rgba(148, 163, 184, 0.2), transparent 34%), linear-gradient(180deg, #1e293b 0%, #0f172a 55%, #020617 100%)",
  canyon: "radial-gradient(circle at 20% 0%, rgba(239, 68, 68, 0.2), transparent 34%), linear-gradient(180deg, #3f1d1d 0%, #111827 56%, #020617 100%)",
  swamp: "radial-gradient(circle at 20% 0%, rgba(20, 184, 166, 0.18), transparent 34%), linear-gradient(180deg, #042f2e 0%, #0f172a 56%, #020617 100%)",
  tower: "radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.2), transparent 34%), linear-gradient(180deg, #172554 0%, #0f172a 58%, #020617 100%)",
  library: "radial-gradient(circle at 20% 0%, rgba(139, 92, 246, 0.22), transparent 34%), linear-gradient(180deg, #2e1065 0%, #111827 56%, #020617 100%)",
  forge: "radial-gradient(circle at 20% 0%, rgba(251, 146, 60, 0.22), transparent 34%), linear-gradient(180deg, #431407 0%, #111827 56%, #020617 100%)",
  citadel: "radial-gradient(circle at 20% 0%, rgba(234, 179, 8, 0.2), transparent 34%), linear-gradient(180deg, #422006 0%, #111827 56%, #020617 100%)",
  abyss: "radial-gradient(circle at 20% 0%, rgba(71, 85, 105, 0.3), transparent 34%), linear-gradient(180deg, #020617 0%, #0f172a 58%, #000 100%)",
  astral: "radial-gradient(circle at 20% 0%, rgba(99, 102, 241, 0.24), transparent 34%), linear-gradient(180deg, #1e1b4b 0%, #111827 56%, #020617 100%)",
  lab: "radial-gradient(circle at 20% 0%, rgba(14, 165, 233, 0.22), transparent 34%), linear-gradient(180deg, #082f49 0%, #0f172a 58%, #020617 100%)",
  throne: "radial-gradient(circle at 20% 0%, rgba(244, 63, 94, 0.22), transparent 34%), linear-gradient(180deg, #4c0519 0%, #111827 56%, #020617 100%)",
  legend: "radial-gradient(circle at 20% 0%, rgba(168, 85, 247, 0.24), transparent 34%), linear-gradient(180deg, #3b0764 0%, #111827 56%, #020617 100%)"
};

const classNames: ClassName[] = ALL_CLASSES;

const formatSearchDate = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return [
    iso,
    new Intl.DateTimeFormat("zh-CN", { dateStyle: "short" }).format(date),
    new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date),
  ].join(" ");
};

type LongRestClassState = {
  xp: number;
  scrolls: number;
  skills: { lineId: string; currentTier: number }[];
};

function buildLongRestSummary(
  logs: ProgressLog[],
  classStates: Record<ClassName, LongRestClassState>,
  streakCount: number
): LongRestSummary {
  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date());
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((l) => new Date(l.at) >= todayStart);

  const classSummaries: LongRestSummary["classSummaries"] = {} as LongRestSummary["classSummaries"];
  let totalXp = 0;
  let totalScrolls = 0;

  for (const cn of classNames) {
    const cnLogs = todayLogs.filter((l) => l.className === cn);
    const progressLogs = cnLogs.filter((l) => l.type !== "scroll");
    const xpGained = progressLogs.reduce((sum, l) => sum + l.classXpAwarded, 0);
    const scrollsEarned = progressLogs.reduce((sum, l) => sum + Math.max(0, l.scrollCount ?? 0), 0);
    const skillEvents = cnLogs.flatMap((l) => {
      if (l.skillUpgrade) return [`${l.skillUpgrade.name} → ${l.skillUpgrade.toTier}环`];
      if (l.newSkill) return [`习得 ${l.newSkill}`];
      return [];
    });

    classSummaries[cn] = { progressCount: progressLogs.length, xpGained, scrollsEarned, skillEvents };
    totalXp += xpGained;
    totalScrolls += scrollsEarned;
  }

  return { date: today, classSummaries, totalXp, totalScrolls, streak: streakCount };
}

export default function QuestFlowPage() {
  const {
    tasks, logs, focusTaskId, totalXp, streak, classStates, featState, progressTags,
    restState, lastProgressClass, lastUndo,
  } = useQuestStore(useShallow((state) => ({
    tasks: state.tasks,
    logs: state.logs,
    focusTaskId: state.focusTaskId,
    totalXp: state.totalXp,
    streak: state.streak,
    classStates: state.classStates,
    featState: state.featState,
    progressTags: state.progressTags,
    restState: state.restState,
    lastProgressClass: state.lastProgressClass,
    lastUndo: state.lastUndo,
  })));
  const {
    addTask, setFocusTask, updateTaskStatus, addTaskTodo, reorderTaskTodo,
    toggleTaskTodo, progressTask, updateTaskTags, completeRecurringTask,
    refreshRecurringTasks, chooseFeat, startShortRest, startLongRest,
    completeRest, cancelRest, undoLastAction, clearUndo,
  } = useQuestStore(useShallow((state) => ({
    addTask: state.addTask,
    setFocusTask: state.setFocusTask,
    updateTaskStatus: state.updateTaskStatus,
    addTaskTodo: state.addTaskTodo,
    reorderTaskTodo: state.reorderTaskTodo,
    toggleTaskTodo: state.toggleTaskTodo,
    progressTask: state.progressTask,
    updateTaskTags: state.updateTaskTags,
    completeRecurringTask: state.completeRecurringTask,
    refreshRecurringTasks: state.refreshRecurringTasks,
    chooseFeat: state.chooseFeat,
    startShortRest: state.startShortRest,
    startLongRest: state.startLongRest,
    completeRest: state.completeRest,
    cancelRest: state.cancelRest,
    undoLastAction: state.undoLastAction,
    clearUndo: state.clearUndo,
  })));

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassName>("Wizard");
  const [statusFilter, setStatusFilter] = useState<QuestStatus>("active");
  const [progressNote, setProgressNote] = useState("");
  const [selectedProgressTagIds, setSelectedProgressTagIds] = useState<string[]>([]);
  const [lastProgress, setLastProgress] = useState<ProgressResult | null>(null);
  const [pulseTaskId, setPulseTaskId] = useState<string | null>(null);
  const [focusFlash, setFocusFlash] = useState(false);
  const [createdQuestTitle, setCreatedQuestTitle] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<ProgressResult | null>(null);
  const [skillCheckInfo, setSkillCheckInfo] = useState<SkillCheckInfo | null>(null);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const progressQueueRef = useRef<ProgressResult[]>([]);
  const progressPlayingRef = useRef(false);
  const skillCheckQueueRef = useRef<SkillCheckInfo[]>([]);
  const skillCheckPlayingRef = useRef(false);
  const [showSpellbook, setShowSpellbook] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TaskTag[]>([]);
  const [showLongRestSummary, setShowLongRestSummary] = useState<LongRestSummary | null>(null);
  const [restCountdown, setRestCountdown] = useState<number | null>(null);
  const [showRestCompleteConfirm, setShowRestCompleteConfirm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showPartyStatus, setShowPartyStatus] = useState(true);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [activeFeatChoiceId, setActiveFeatChoiceId] = useState<string | null>(null);
  const [dismissedFeatChoiceIds, setDismissedFeatChoiceIds] = useState<string[]>([]);
  const [newResonance, setNewResonance] = useState<ResonanceTrigger | null>(null);
  const [normalResonance, setNormalResonance] = useState<ResonanceTrigger | null>(null);
  const normalResonanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rest countdown timer
  useEffect(() => {
    if (!restState) {
      setRestCountdown(null);
      return;
    }
    const update = () => {
      const remaining = new Date(restState.endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        setShowRestCompleteConfirm(true);
        return;
      }
      setRestCountdown(Math.ceil(remaining / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [restState]);

  const handleRestCompleteConfirm = () => {
    if (restState?.type === "long") {
      const state = useQuestStore.getState();
      const summary = buildLongRestSummary(state.logs, state.classStates, state.streak.count);
      setShowLongRestSummary(summary);
    }
    completeRest();
    setShowRestCompleteConfirm(false);
  };

  const handleQuickFinish = () => {
    setShowRestCompleteConfirm(true);
  };

  useEffect(() => {
    setMounted(true);
    refreshRecurringTasks();

    const interval = window.setInterval(refreshRecurringTasks, 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshRecurringTasks();
    };
    window.addEventListener("focus", refreshRecurringTasks);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshRecurringTasks);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshRecurringTasks]);

  useEffect(() => () => {
    if (normalResonanceTimerRef.current) clearTimeout(normalResonanceTimerRef.current);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const taskSearchText = useCallback((task: QuestTask) => {
    const taskClass = getTaskClass(task);
    const meta = CLASS_META[taskClass];
    return [
      task.title,
      task.status,
      taskClass,
      meta.label,
      meta.emoji,
      task.tags.map((tag) => TAG_META[tag]?.label ?? tag).join(" "),
      formatSearchDate(task.createdAt),
      formatSearchDate(task.updatedAt),
      formatSearchDate(task.lastFocusedAt),
      formatSearchDate(task.recurringCompletedAt),
      task.todos.map((todo) => `${todo.title} ${formatSearchDate(todo.completedAt)}`).join(" "),
    ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
  }, []);

  const logSearchText = useCallback((log: ProgressLog) => {
    const task = tasks.find((item) => item.id === log.taskId);
    const taskClass = log.className && CLASS_META[log.className] ? log.className : "Wizard";
    const meta = CLASS_META[taskClass];
    return [
      log.type,
      log.type === "scroll" ? "卷轴 scroll" : "推进 progress 事件",
      log.note,
      formatSearchDate(log.at),
      taskClass,
      meta.label,
      meta.emoji,
      task?.title,
      log.resonanceKey,
      log.resonanceName,
      log.resonanceReward,
      log.scrollEarned,
      log.newSkill,
      log.skillUpgrade?.name,
      log.todoTitle,
      log.progressTags?.map((tag) => tag.name).join(" "),
    ].filter(Boolean).join(" ").toLocaleLowerCase("zh-CN");
  }, [tasks]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("zh-CN");
  const searchLogMatches = useMemo(
    () => normalizedSearch ? logs.filter((log) => logSearchText(log).includes(normalizedSearch)) : [],
    [logSearchText, logs, normalizedSearch]
  );
  const searchMatchedTaskIds = useMemo(
    () => new Set(searchLogMatches.map((log) => log.taskId)),
    [searchLogMatches]
  );
  const matchesSearch = useCallback((task: QuestTask) => {
    if (!normalizedSearch) return true;
    return taskSearchText(task).includes(normalizedSearch) || searchMatchedTaskIds.has(task.id);
  }, [normalizedSearch, searchMatchedTaskIds, taskSearchText]);

  const activeTasks = useMemo(
    () => tasks
      .filter((t) => t.status === "active")
      .filter(matchesSearch),
    [matchesSearch, tasks]
  );
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.status === statusFilter).filter(matchesSearch);
    if (statusFilter !== "active") return filtered;
    return filtered;
  }, [matchesSearch, statusFilter, tasks]);
  const focusTask = useMemo(() => tasks.find((t) => t.id === focusTaskId && t.status !== "archived"), [focusTaskId, tasks]);
  const visibleLogs = useMemo(
    () => (normalizedSearch
      ? searchLogMatches
      : logs.filter((log) => log.taskId === focusTask?.id || log.type === "scroll")
    ).slice(0, 12),
    [focusTask?.id, logs, normalizedSearch, searchLogMatches]
  );
  const level = getLevelProgress(totalXp);

  const focusRegionId = focusTask ? "camp" : "camp";
  const focusBg = darkMode
    ? darkRegionBackgrounds[focusRegionId] ?? darkRegionBackgrounds.camp
    : regionBackgrounds[focusRegionId] ?? regionBackgrounds.camp;
  const activeFeatChoice = useMemo(
    () => featState.pending.find((choice) => choice.id === activeFeatChoiceId)
      ?? featState.pending.find((choice) => !dismissedFeatChoiceIds.includes(choice.id)),
    [activeFeatChoiceId, dismissedFeatChoiceIds, featState.pending]
  );
  const visibleClassNames = useMemo(() => {
    const lastClass = lastProgressClass ?? focusTask?.className;
    const ordered = [...ALL_CLASSES].sort((a, b) => {
      if (a === lastClass) return -1;
      if (b === lastClass) return 1;
      const stateA = classStates[a];
      const stateB = classStates[b];
      const activityA = stateA.xp + stateA.scrolls * 25 + stateA.skills.length * 10 + stateA.fatigue;
      const activityB = stateB.xp + stateB.scrolls * 25 + stateB.skills.length * 10 + stateB.fatigue;
      return activityB - activityA;
    });
    return showAllClasses ? ordered : ordered.slice(0, 4);
  }, [classStates, focusTask?.className, lastProgressClass, showAllClasses]);

  const createQuest = () => {
    const questTitle = title.trim();
    const newTaskId = addTask(questTitle, selectedClass, selectedTags);
    if (!newTaskId) return;
    setTitle("");
    setSelectedTags([]);
    setStatusFilter("active");
    setCreatedQuestTitle(questTitle);
    setTimeout(() => setCreatedQuestTitle(null), 1400);
    if (!focusTaskId) {
      setFocusFlash(true);
      setTimeout(() => setFocusFlash(false), 320);
    }
  };

  const submitTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createQuest();
  };

  const changeFocus = useCallback((taskId: string) => {
    if (taskId === focusTaskId) return;
    setFocusTask(taskId);
    setFocusFlash(true);
    setTimeout(() => setFocusFlash(false), 320);
  }, [focusTaskId, setFocusTask]);

  const playNextSkillCheck = useCallback(() => {
    if (skillCheckPlayingRef.current) return;
    const next = skillCheckQueueRef.current.shift();
    if (!next) return;

    skillCheckPlayingRef.current = true;
    setSkillCheckInfo(next);
    setTimeout(() => {
      setSkillCheckInfo(null);
      skillCheckPlayingRef.current = false;
      setTimeout(playNextSkillCheck, 180);
    }, 3000);
  }, []);

  const enqueueSkillCheck = useCallback((info: SkillCheckInfo) => {
    const q = skillCheckQueueRef.current;
    if (q.length >= 3) return;
    q.push(info);
    playNextSkillCheck();
  }, [playNextSkillCheck]);

  const playNextProgress = useCallback(() => {
    if (progressPlayingRef.current) return;
    const next = progressQueueRef.current.shift();
    if (!next) return;

    progressPlayingRef.current = true;
    setLastProgress(next);
    setPulseTaskId(next.taskId);
    if (next.milestone) setCelebration(next);

    setTimeout(() => setPulseTaskId(null), 760);
    setTimeout(() => {
      setLastProgress(null);
      if (next.milestone) setCelebration(null);
      progressPlayingRef.current = false;
      setTimeout(playNextProgress, 180);
    }, 1200);
  }, []);

  const enqueueProgress = useCallback((result: ProgressResult) => {
    const q = progressQueueRef.current;
    if (q.length >= 3) return;
    q.push(result);
    playNextProgress();
  }, [playNextProgress]);

  const handleProgressResult = useCallback((result: ProgressResult | null) => {
    if (!result) return;

    enqueueProgress(result);
    if (result.resonance?.isNew) {
      setNewResonance(result.resonance);
    } else if (result.resonance) {
      if (normalResonanceTimerRef.current) clearTimeout(normalResonanceTimerRef.current);
      setNormalResonance(result.resonance);
      normalResonanceTimerRef.current = setTimeout(() => {
        setNormalResonance(null);
        normalResonanceTimerRef.current = null;
      }, 1600);
    }

    if (result.skillCheck) {
      enqueueSkillCheck({
        check: result.skillCheck,
        scrollEarned: result.scrollEarned,
        scrollCount: result.scrollCount,
        newSkill: result.newSkill,
        skillUpgrade: result.skillUpgrade ? { ...result.skillUpgrade, className: result.skillCheck.className } : undefined,
        synergyBonus: result.synergyBonus,
        resonanceName: result.resonance?.name,
        resonanceReward: result.resonance?.reward.label
      });
    }
  }, [enqueueProgress, enqueueSkillCheck]);

  const pushProgress = useCallback((taskId: string, note?: string) => {
    handleProgressResult(progressTask(taskId, { note }));
  }, [handleProgressResult, progressTask]);

  const toggleProgressTag = (tagId: string) => {
    setSelectedProgressTagIds((ids) => ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId]);
  };

  const pushFocusProgress = () => {
    if (!focusTask) return;
    handleProgressResult(progressTask(focusTask.id, { note: progressNote, progressTagIds: selectedProgressTagIds }));
    setProgressNote("");
    setSelectedProgressTagIds([]);
  };

  const completeFocusRecurring = () => {
    if (!focusTask) return;
    handleProgressResult(completeRecurringTask(focusTask.id));
    setProgressNote("");
    setSelectedProgressTagIds([]);
  };

  const createFocusTodo = () => {
    if (!focusTask) return;
    const createdId = addTaskTodo(focusTask.id, todoTitle);
    if (createdId) setTodoTitle("");
  };

  const submitFocusTodo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createFocusTodo();
  };

  const completeFocusTodo = (todoId: string) => {
    if (!focusTask) return;
    handleProgressResult(toggleTaskTodo(focusTask.id, todoId));
  };

  const reorderFocusTodo = (todoId: string, targetTodoId: string) => {
    if (!focusTask) return;
    reorderTaskTodo(focusTask.id, todoId, targetTodoId);
  };

  const selectFeat = (choiceId: string, featId: string) => {
    if (chooseFeat(choiceId, featId)) {
      setActiveFeatChoiceId(null);
      setDismissedFeatChoiceIds((ids) => ids.filter((id) => id !== choiceId));
    }
  };

  const dismissFeatChoice = (choiceId: string) => {
    setActiveFeatChoiceId(null);
    setDismissedFeatChoiceIds((ids) => ids.includes(choiceId) ? ids : [...ids, choiceId]);
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setShowSearchPanel(true);
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
        return;
      }
      if (key === "n") {
        event.preventDefault();
        setShowCreateForm(true);
        window.requestAnimationFrame(() => titleInputRef.current?.focus());
        return;
      }
      if (key === "a" && !isTypingTarget(event.target)) {
        event.preventDefault();
        const firstActiveTask = activeTasks[0];
        if (firstActiveTask) changeFocus(firstActiveTask.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTasks, changeFocus]);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 text-sm text-slate-500">
        QuestFlow loading
      </main>
    );
  }

  return (
    <motion.main
      className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, background: focusBg }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence>
        {focusFlash ? <FocusChangedOverlay key="focus-flash" /> : null}
        {createdQuestTitle ? <QuestCreatedOverlay key={createdQuestTitle} title={createdQuestTitle} /> : null}
        {celebration ? <MilestoneOverlay key={`milestone-${celebration.taskId}-${celebration.progressCount}`} result={celebration} /> : null}
        {normalResonance ? <NormalResonanceEffect key={`normal-resonance-${normalResonance.key}-${normalResonance.triggerCount}`} resonance={normalResonance} /> : null}
        {newResonance ? <NewResonanceModal key={`new-resonance-${newResonance.key}`} resonance={newResonance} discoveredCount={Object.keys(useQuestStore.getState().discoveredResonances).length} onClose={() => setNewResonance(null)} /> : null}
        {activeFeatChoice ? <FeatChoiceModal key={activeFeatChoice.id} choice={activeFeatChoice} onClose={dismissFeatChoice} onSelect={selectFeat} /> : null}
        {lastUndo ? (
          <motion.div
            key={lastUndo.createdAt}
            className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(calc(100vw-2rem),30rem)] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            role="status"
          >
            <span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-100">{lastUndo.label}</span>
            <span className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={undoLastAction} className="focus-ring rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950" aria-label={lastUndo.label}>
                撤销
              </button>
              <button type="button" onClick={clearUndo} className="focus-ring rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="关闭撤销提示">
                关闭
              </button>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SkillCheckToast info={skillCheckInfo} />

      {/* Header */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between dark:text-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/logo2.png"
              alt="QuestFlow logo"
              width={96}
              height={96}
              priority
              className="h-24 w-24 rounded-2xl object-cover shadow-sm"
            />
            <h1 className="text-3xl font-semibold text-slate-950">QuestFlow</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">DnD Progress Tracker for agent-heavy work</p>
        </div>

        <section className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:min-w-[440px]" aria-label="核心指标">
          <Metric label={`Level ${level.level}`} value={`${level.current} / ${level.required} XP`}>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-amber-400"
                initial={false}
                animate={{ width: `${level.percent}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
          </Metric>
          <Metric label="Streak" value={`${streak.count} 天`}>
            <Flame size={18} className="mt-2 text-amber-500" />
          </Metric>
          <Metric label="Active" value={`${activeTasks.length} quests`}>
            <Target size={18} className="mt-2 text-emerald-600" />
          </Metric>
        </section>
      </header>

      {/* Party Status */}
      <section className="mb-3 rounded-xl border border-slate-200 bg-white/75 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75" aria-label="队伍职业状态">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Party Status</div>
            <div className="text-xs font-medium text-slate-500">优先显示最近完成职业，其余按活跃度排序</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showPartyStatus ? (
              <button
                type="button"
                onClick={() => setShowAllClasses((value) => !value)}
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label={showAllClasses ? "收起职业状态到四个" : "展开全部职业状态"}
              >
                {showAllClasses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAllClasses ? "显示 4 个" : `展开全部 ${ALL_CLASSES.length}`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowPartyStatus((value) => !value)}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-expanded={showPartyStatus}
              aria-label={showPartyStatus ? "收起队伍状态" : "展开队伍状态"}
            >
              {showPartyStatus ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showPartyStatus ? "收起" : "展开"}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {showPartyStatus ? (
            <motion.div
              key="party-status-grid"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <AnimatePresence initial={false}>
                  {visibleClassNames.map((cn) => {
                    const meta = CLASS_META[cn];
                    const cs = classStates[cn];
                    const lvl = getClassLevel(cs.xp);
                    const currentXp = cs.xp % 100;
                    const xpPercent = Math.min(100, currentXp);
                    const scrollCount = cs.scrolls;
                    const skillCount = cs.skills.length;
                    const fatigueStage = getFatigueStage(cs.fatigue);
                    const stageMeta = FATIGUE_STAGE_META[fatigueStage];
                    const ownedFeats = getOwnedFeatsForClass(featState, cn);
                    const primaryFlow = getPrimaryFeatFlow(featState, cn);
                    const nextFeatLevel = getNextFeatLevel(cn, classStates, featState);
                    return (
                      <motion.div
                        layout
                        key={cn}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${classStyles[cn]}`}
                      >
                        <div
                          className="group relative"
                          title={`${cn} Lv${lvl} · ${meta.label}\nXP ${cs.xp}（本级 ${currentXp}/100）\n卷轴 ${scrollCount} · 技能 ${skillCount} · 专长 ${ownedFeats.length}\nFatigue ${cs.fatigue}% · ${stageMeta.label}\n${primaryFlow ? `主要流派：${FEAT_FLOW_META[primaryFlow].label}` : "主要流派：未成型"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-2">
                              <span className="shrink-0">{meta.emoji}</span>
                              <span className="min-w-0 truncate font-black">{cn} Lv{lvl}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 text-[10px] opacity-70">
                              {cn === lastProgressClass && <span className="rounded-full bg-white/80 px-1.5 font-black">最近</span>}
                              {scrollCount > 0 && <span>📜{scrollCount}</span>}
                              {skillCount > 0 && <span>✨{skillCount}</span>}
                              {ownedFeats.length > 0 && <span>🧬{ownedFeats.length}</span>}
                            </div>
                          </div>
                          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-64 rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 shadow-2xl group-hover:block">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-black text-slate-950">{meta.emoji} {cn} Lv{lvl}</div>
                              <div className="text-[10px] font-black text-slate-400">{meta.label}</div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px] font-bold">
                              <div className="rounded-xl bg-slate-50 px-2 py-1">XP<br />{cs.xp}</div>
                              <div className="rounded-xl bg-slate-50 px-2 py-1">卷轴<br />{scrollCount}</div>
                              <div className="rounded-xl bg-slate-50 px-2 py-1">技能<br />{skillCount}</div>
                            </div>
                            <div className="mt-2 text-xs font-bold text-slate-500">疲劳：{stageMeta.emoji} {stageMeta.label} · {cs.fatigue}%</div>
                            <div className="mt-1 text-xs font-bold text-slate-500">专长：{ownedFeats.length} 个 · {primaryFlow ? FEAT_FLOW_META[primaryFlow].label : "未成型"}</div>
                            <Link href={`/build?class=${cn}`} className="pointer-events-auto mt-3 inline-flex rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition hover:bg-slate-800">
                              查看 Build
                            </Link>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="shrink-0 text-[10px] opacity-60">XP</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                            <motion.div
                              className="h-full rounded-full bg-current opacity-70"
                              initial={false}
                              animate={{ width: `${xpPercent}%` }}
                              transition={{ duration: 0.45, ease: "easeOut" }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] opacity-70">{currentXp}/100</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="shrink-0 text-[10px] opacity-60">{stageMeta.emoji}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                            <motion.div
                              key={`${cn}-fatigue-${fatigueStage}`}
                              className="h-full rounded-full"
                              style={{ backgroundColor: stageMeta.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, cs.fatigue)}%` }}
                              transition={{ duration: 0.45, ease: "easeOut" }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] opacity-70">{cs.fatigue}%</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] font-black opacity-75">
                          {primaryFlow ? <span>{FEAT_FLOW_META[primaryFlow].emoji} {FEAT_FLOW_META[primaryFlow].label}</span> : <span>专长未选择</span>}
                          {nextFeatLevel ? <span>下个专长 Lv{nextFeatLevel}</span> : <span>可继续成长</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      {/* Action bar */}
      <div className="mb-3 flex flex-wrap gap-2" aria-label="快捷操作栏">
        <button
          type="button"
          onClick={() => setShowSpellbook(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-[0.97]"
        >
          <BookOpen size={16} />
          Spellbook
        </button>
        <Link
          href="/resonance"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 active:scale-[0.97]"
        >
          <Sparkles size={16} />
          共鸣圣殿
        </Link>
        <Link
          href="/build"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 active:scale-[0.97]"
        >
          <Trophy size={16} />
          Build
        </Link>
        <Link
          href="/tags"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97]"
        >
          <Tags size={16} />
          Tags
        </Link>
        <button
          type="button"
          onClick={() => {
            setShowSearchPanel((value) => {
              const next = !value;
              if (next) {
                window.requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                  searchInputRef.current?.select();
                });
              }
              return next;
            });
          }}
          className={`focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition active:scale-[0.97] ${
            showSearchPanel || normalizedSearch
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          }`}
          aria-expanded={showSearchPanel}
          aria-controls="quest-search-panel"
          aria-label="展开或收起搜索"
        >
          <Search size={16} />
          搜索{normalizedSearch ? ` · ${visibleTasks.length}` : ""}
        </button>
        {restState ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            {restState.type === "short" ? <Coffee size={16} /> : <Tent size={16} />}
            {restState.type === "short" ? "短休中" : "长休中"}
            {restCountdown !== null && (
              <span className="animate-pulse rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold">{Math.floor(restCountdown / 60)}:{String(restCountdown % 60).padStart(2, "0")}</span>
            )}
            <button
              type="button"
              onClick={handleQuickFinish}
              className="ml-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
            >
              提前结束
            </button>
            <button
              type="button"
              onClick={cancelRest}
              className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-600 hover:bg-amber-100"
            >
              取消
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startShortRest}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 active:scale-[0.97]"
            >
              <Coffee size={16} />
              短休 {SHORT_REST_MINUTES}min
            </button>
            <button
              type="button"
              onClick={startLongRest}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.97]"
            >
              <Tent size={16} />
              长休 {LONG_REST_MINUTES}min
            </button>
          </>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          aria-label={darkMode ? "切换到亮色主题" : "切换到暗色主题"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? "亮色" : "暗色"}
        </button>
        <Link
          href="/sync"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 active:scale-[0.97]"
        >
          <Cloud size={16} />
          同步
        </Link>
      </div>

      <AnimatePresence initial={false}>
        {showSearchPanel ? (
          <motion.section
            id="quest-search-panel"
            key="quest-search-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/85"
            aria-label="搜索任务和日志"
          >
            <label className="sr-only" htmlFor="quest-search">搜索 QuestFlow</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950/70">
              <Search size={17} className="shrink-0 text-slate-500" />
              <input
                id="quest-search"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索标题 / 职业 / 事件类型 / 日期 / 日志（Ctrl+K）"
                className="focus-ring min-h-11 w-full bg-transparent text-sm text-slate-950 placeholder:text-slate-400 dark:text-slate-100"
                aria-label="搜索标题、职业、事件类型、日期和日志"
              />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery("")} className="focus-ring rounded-md px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="清空搜索">
                  清空
                </button>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* Create form */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="focus-ring flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
          aria-expanded={showCreateForm}
          aria-controls="create-quest-form"
        >
          <span className="flex items-center gap-2">
            <Plus size={16} />
            新建任务 <span className="text-xs font-bold text-slate-400">(Ctrl+N)</span>
          </span>
          {showCreateForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence>
          {showCreateForm && (
            <motion.form
              id="create-quest-form"
              onSubmit={submitTask}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 px-3 pt-3 pb-3">
                <label className="sr-only" htmlFor="quest-title">新建任务</label>
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
                  <Plus size={17} className="shrink-0 text-slate-500" />
                  <textarea
                    id="quest-title"
                    ref={titleInputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        createQuest();
                      }
                    }}
                    placeholder="新增 Quest，Ctrl/⌘+Enter 创建"
                    rows={1}
                    className="focus-ring min-h-11 w-full resize-none overflow-hidden bg-transparent py-3 text-sm leading-5 text-slate-950 placeholder:text-slate-400"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Class</span>
                  {ALL_CLASSES.map((cn) => {
                    const meta = CLASS_META[cn];
                    return (
                      <button
                        key={cn}
                        type="button"
                        onClick={() => setSelectedClass(cn)}
                        className={`focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          selectedClass === cn
                            ? classStyles[cn]
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                        aria-pressed={selectedClass === cn}
                      >
                        {meta.emoji} {cn}（{meta.label}）
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">标签</span>
                  {(["important", "urgent", "daily", "weekly"] as TaskTag[]).map((tag) => {
                    const meta = TAG_META[tag];
                    const active = selectedTags.includes(tag);
                    const bonus = tag === "important" ? 3 : tag === "urgent" ? 2 : 0;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                        className="focus-ring rounded-full border px-3 py-1.5 text-xs font-semibold transition dark:border-slate-700 dark:text-slate-200"
                        aria-pressed={active}
                        style={active ? {
                          color: meta.textColor,
                          backgroundColor: meta.bgColor,
                          borderColor: meta.borderColor
                        } : undefined}
                      >
                        {meta.label} {active && bonus > 0 ? `+${bonus} XP` : ""}
                      </button>
                    );
                  })}
                  {selectedTags.includes("important") && selectedTags.includes("urgent") && (
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">🟣 +5 XP</span>
                  )}
                  <div className="flex-1" />
                  <button
                    type="submit"
                    className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!title.trim()}
                  >
                    <Plus size={17} />
                    Create
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0">
          <FocusPanel
            task={focusTask}
            note={progressNote}
            setNote={setProgressNote}
            progressTags={progressTags}
            selectedProgressTagIds={selectedProgressTagIds}
            onToggleProgressTag={toggleProgressTag}
            onProgress={pushFocusProgress}
            onCompleteRecurring={completeFocusRecurring}
            lastProgress={lastProgress}
            isPulsing={pulseTaskId === focusTask?.id}
          />

          {/* Quick switch active tasks */}
          {activeTasks.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeTasks.map((t) => {
                const tc = getTaskClass(t);
                const isCurrent = t.id === focusTask?.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changeFocus(t.id)}
                    className={`focus-ring inline-flex min-h-10 max-w-[180px] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-[0.95] ${
                      isCurrent
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200"
                    }`                    }
                    aria-label={`专注任务：${t.title}`}
                    style={
                      isCurrent
                        ? undefined
                        : {
                            color: CLASS_META[tc].hexColor,
                            borderColor: CLASS_META[tc].hexColor + "40",
                          }
                    }
                  >
                    <span>{CLASS_META[tc].emoji}</span>
                    <span className="truncate">{t.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          <section className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`focus-ring rounded-md px-3 py-2 text-sm font-medium transition ${
                      statusFilter === tab.id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-slate-500">{visibleTasks.length} quests{normalizedSearch ? ` · ${visibleLogs.length} 条日志` : ""}</span>
            </div>

            {visibleTasks.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {visibleTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    task={task}
                    isFocus={task.id === focusTask?.id}
                    isPulsing={pulseTaskId === task.id}
                    onFocus={() => changeFocus(task.id)}
                    onProgress={() => pushProgress(task.id)}
                    onStatus={(s) => updateTaskStatus(task.id, s)}
                    onTagsChange={(tags) => updateTaskTags(task.id, tags)}
                  />
                ))}
              </div>
            ) : normalizedSearch ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                没有找到匹配“{searchQuery.trim()}”的 {statusTabs.find((tab) => tab.id === statusFilter)?.label} 任务；可切换状态标签查看 Paused / Archived。
              </div>
            ) : (
              <EmptyState status={statusFilter} />
            )}
          </section>
        </section>

        <aside className="min-w-0 space-y-4">
          <FocusTodoPanel
            task={focusTask}
            title={todoTitle}
            setTitle={setTodoTitle}
            showCompleted={showCompletedTodos}
            setShowCompleted={setShowCompletedTodos}
            onSubmit={submitFocusTodo}
            onCreate={createFocusTodo}
            onToggle={completeFocusTodo}
            onReorder={reorderFocusTodo}
          />
          <ProgressLogPanel logs={visibleLogs} task={normalizedSearch ? undefined : focusTask} title={normalizedSearch ? "搜索命中的日志" : undefined} subtitle={normalizedSearch ? `“${searchQuery.trim()}”` : undefined} />
        </aside>
      </div>

      {/* Rest Complete Confirm */}
      {showRestCompleteConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="休息完成确认"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
          >
            <div className="text-4xl">{restState?.type === "short" ? "☕" : "🏕️"}</div>
            <h3 className="mt-3 text-lg font-bold text-slate-950">
              {restState?.type === "short" ? "短休结束" : "长休结束"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {restState?.type === "short" ? "你已经休息好了吗？" : "你已经休息好了吗？疲劳将全部恢复。"}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowRestCompleteConfirm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                再等一会
              </button>
              <button
                type="button"
                onClick={handleRestCompleteConfirm}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                休息好了
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Long Rest Summary */}
      {showLongRestSummary && <LongRestSummaryModal summary={showLongRestSummary} onClose={() => setShowLongRestSummary(null)} />}

      {/* Spellbook */}
      {showSpellbook && <Spellbook onClose={() => setShowSpellbook(false)} />}
    </motion.main>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950 sm:text-base dark:text-slate-100">{value}</div>
      {children}
    </div>
  );
}

function EmptyState({ status }: { status: QuestStatus }) {
  const text = status === "active" ? "还没有 Active Quest" : status === "paused" ? "没有暂停中的 Quest" : "没有归档的 Quest";
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center">
      <div>
        <Target className="mx-auto text-slate-400" size={28} />
        <p className="mt-2 text-sm font-medium text-slate-600">{text}</p>
      </div>
    </div>
  );
}
