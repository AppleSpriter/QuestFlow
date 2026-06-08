"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Cloud,
  Coffee,
  EyeOff,
  Flame,
  GripVertical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Tags,
  Target,
  Tent,
  Trophy,
  Zap
} from "lucide-react";
import type { CSSProperties, DragEvent, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PROGRESS_TAG_COLOR,
  PROGRESS_TAG_COLORS,
  getLevelProgress,
  type ProgressLog,
  type ProgressResult,
  type ProgressTag,
  type QuestTodoItem,
  type QuestStatus,
  type QuestTask,
  type RestState,
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
  getMapRegion,
  getFatigueStage,
  FATIGUE_STAGE_META,
  SHORT_REST_MINUTES,
  LONG_REST_MINUTES
} from "@/data/classes";
import type { ResonanceTrigger } from "@/data/resonance";
import { SkillCheckToast, type SkillCheckInfo } from "@/components/SkillCheckToast";
import { Spellbook } from "@/components/Spellbook";
import { TaskMapProgress } from "@/components/TaskMapProgress";
import {
  FEAT_FLOW_META,
  FEAT_MAP,
  FEAT_QUALITY_META,
  getNextFeatLevel,
  getOwnedFeatsForClass,
  getPrimaryFeatFlow,
  type PendingFeatChoice
} from "@/data/feats";

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

const relativeTime = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
};

const formatLogTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));

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

const classNames: ClassName[] = ALL_CLASSES;

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
  const tasks = useQuestStore((state) => state.tasks);
  const logs = useQuestStore((state) => state.logs);
  const focusTaskId = useQuestStore((state) => state.focusTaskId);
  const totalXp = useQuestStore((state) => state.totalXp);
  const streak = useQuestStore((state) => state.streak);
  const classStates = useQuestStore((state) => state.classStates);
  const featState = useQuestStore((state) => state.featState);
  const progressTags = useQuestStore((state) => state.progressTags);
  const addTask = useQuestStore((state) => state.addTask);
  const setFocusTask = useQuestStore((state) => state.setFocusTask);
  const updateTaskStatus = useQuestStore((state) => state.updateTaskStatus);
  const addTaskTodo = useQuestStore((state) => state.addTaskTodo);
  const reorderTaskTodo = useQuestStore((state) => state.reorderTaskTodo);
  const toggleTaskTodo = useQuestStore((state) => state.toggleTaskTodo);
  const progressTask = useQuestStore((state) => state.progressTask);
  const updateTaskTags = useQuestStore((state) => state.updateTaskTags);
  const completeRecurringTask = useQuestStore((state) => state.completeRecurringTask);
  const refreshRecurringTasks = useQuestStore((state) => state.refreshRecurringTasks);
  const chooseFeat = useQuestStore((state) => state.chooseFeat);

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
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
  const [showPartyStatus, setShowPartyStatus] = useState(true);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [activeFeatChoiceId, setActiveFeatChoiceId] = useState<string | null>(null);
  const [dismissedFeatChoiceIds, setDismissedFeatChoiceIds] = useState<string[]>([]);
  const [newResonance, setNewResonance] = useState<ResonanceTrigger | null>(null);
  const [normalResonance, setNormalResonance] = useState<ResonanceTrigger | null>(null);
  const normalResonanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restState = useQuestStore((state) => state.restState);
  const startShortRest = useQuestStore((state) => state.startShortRest);
  const startLongRest = useQuestStore((state) => state.startLongRest);
  const completeRest = useQuestStore((state) => state.completeRest);
  const cancelRest = useQuestStore((state) => state.cancelRest);
  const lastProgressClass = useQuestStore((state) => state.lastProgressClass);

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
  }, [refreshRecurringTasks]);

  useEffect(() => () => {
    if (normalResonanceTimerRef.current) clearTimeout(normalResonanceTimerRef.current);
  }, []);

  const activeTasks = useMemo(
    () => tasks
      .filter((t) => t.status === "active")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [tasks]
  );
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.status === statusFilter);
    if (statusFilter !== "active") return filtered;
    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.lastFocusedAt ?? a.updatedAt).getTime();
      const bTime = new Date(b.lastFocusedAt ?? b.updatedAt).getTime();
      return aTime - bTime;
    });
  }, [statusFilter, tasks]);
  const focusTask = useMemo(() => tasks.find((t) => t.id === focusTaskId && t.status !== "archived"), [focusTaskId, tasks]);
  const focusLogs = useMemo(
    () => logs.filter((log) => log.taskId === focusTask?.id || log.type === 'scroll').slice(0, 8),
    [focusTask?.id, logs]
  );
  const level = getLevelProgress(totalXp);

  const focusRegionId = focusTask ? getMapRegion(focusTask.progressCount).id : "camp";
  const focusBg = regionBackgrounds[focusRegionId] ?? regionBackgrounds.camp;
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

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createQuest();
  };

  const changeFocus = (taskId: string) => {
    if (taskId === focusTaskId) return;
    setFocusTask(taskId);
    setFocusFlash(true);
    setTimeout(() => setFocusFlash(false), 320);
  };

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
    skillCheckQueueRef.current.push(info);
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
    progressQueueRef.current.push(result);
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

  const submitFocusTodo = (event: FormEvent<HTMLFormElement>) => {
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
      </AnimatePresence>

      <SkillCheckToast info={skillCheckInfo} />

      {/* Header */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <section className="grid grid-cols-3 gap-2 sm:min-w-[440px]">
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
      <section className="mb-3 rounded-xl border border-slate-200 bg-white/75 p-2 shadow-sm backdrop-blur">
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
                className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.97]"
              >
                {showAllClasses ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAllClasses ? "显示 4 个" : `展开全部 ${ALL_CLASSES.length}`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowPartyStatus((value) => !value)}
              className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.97]"
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
      <div className="mb-3 flex flex-wrap gap-2">
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
        <Link
          href="/sync"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 active:scale-[0.97]"
        >
          <Cloud size={16} />
          同步
        </Link>
      </div>

      {/* Create form */}
      <div className="mb-5 rounded-lg border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <Plus size={16} />
            新建任务
          </span>
          {showCreateForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence>
          {showCreateForm && (
            <motion.form
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        createQuest();
                      }
                    }}
                    placeholder="新增 Quest，⌘+Enter 创建"
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
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          selectedClass === cn
                            ? classStyles[cn]
                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
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
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
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
                    className={`inline-flex max-w-[180px] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-[0.95] ${
                      isCurrent
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-100 active:bg-slate-200"
                    }`}
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
              <span className="text-sm text-slate-500">{visibleTasks.length} quests</span>
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
          <ProgressLogPanel logs={focusLogs} task={focusTask} />
        </aside>
      </div>

      {/* Rest Complete Confirm */}
      {showRestCompleteConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
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

/* ─── Sub-components ─── */

function Metric({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">{value}</div>
      {children}
    </div>
  );
}

function FocusPanel({ task, note, setNote, progressTags, selectedProgressTagIds, onToggleProgressTag, onProgress, onCompleteRecurring, lastProgress, isPulsing }: {
  task?: QuestTask;
  note: string;
  setNote: (v: string) => void;
  progressTags: ProgressTag[];
  selectedProgressTagIds: string[];
  onToggleProgressTag: (tagId: string) => void;
  onProgress: () => void;
  onCompleteRecurring: () => void;
  lastProgress: ProgressResult | null;
  isPulsing: boolean;
}) {
  const taskClass = task ? getTaskClass(task) : "Wizard";
  const recurringFrequency = task?.tags.includes("daily") ? "daily" : task?.tags.includes("weekly") ? "weekly" : undefined;

  return (
    <motion.section
      className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-lift"
      animate={isPulsing ? { scale: [1, 1.012, 1] } : { scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <AnimatePresence>
        {lastProgress && task?.id === lastProgress.taskId ? (
          <ProgressBurst key={`${lastProgress.taskId}-${lastProgress.at}`} result={lastProgress} />
        ) : null}
      </AnimatePresence>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
          <Target size={17} />
          当前专注
        </div>
        {task ? (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classStyles[taskClass]}`}>
            {CLASS_META[taskClass].emoji} {taskClass}
          </span>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {task ? (
          <motion.div key={task.id} initial={{ opacity: 0, x: 42 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -42 }} transition={{ duration: 0.26 }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words text-3xl font-semibold sm:text-4xl" style={{ color: CLASS_META[taskClass].hexColor }}>{task.title}</h2>
                  {(task.tags ?? []).map((tag) => {
                    const meta = TAG_META[tag];
                    return (
                      <span
                        key={`focus-${task.id}-${tag}`}
                        className="rounded-full border px-2 py-0.5 text-[10px] font-black"
                        style={{ color: meta.textColor, backgroundColor: meta.bgColor, borderColor: meta.borderColor }}
                      >
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                  <span>Progress {task.progressCount}</span>
                  <span>最近更新 {relativeTime(task.updatedAt)}</span>
                  {task.status === "paused" && <span>Paused</span>}
                </div>
                <div className="mt-2"><TaskMapProgress progressCount={task.progressCount} /></div>
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                <motion.span key={task.progressCount} initial={{ y: -10, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} className="text-5xl font-semibold text-slate-950">
                  {task.progressCount}
                </motion.span>
                <span className="text-sm font-medium text-slate-500">steps</span>
              </div>
            </div>
            {progressTags.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Progress Tags</span>
                {progressTags.map((tag) => {
                  const color = PROGRESS_TAG_COLORS[tag.colorId] ?? PROGRESS_TAG_COLORS[DEFAULT_PROGRESS_TAG_COLOR];
                  const active = selectedProgressTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggleProgressTag(tag.id)}
                      className={`rounded-full border px-3 py-1.5 font-black transition hover:-translate-y-0.5 active:scale-[0.96] ${
                        active ? "text-xs shadow-sm" : "text-[9px] opacity-45 grayscale"
                      }`}
                      style={{
                        color: active ? color.textColor : "#64748b",
                        backgroundColor: active ? color.bgColor : "#f1f5f9",
                        borderColor: active ? color.borderColor : "#cbd5e1"
                      }}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                可在 <Link href="/tags" className="font-black text-emerald-700 hover:underline">Tags 页面</Link> 创建常用 Progress 标签。
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onProgress(); }}
                placeholder="备注这一步推进了什么，⌘+Enter 提交"
                rows={2}
                className="focus-ring min-h-12 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-950 placeholder:text-slate-400"
              />
              <div className="grid gap-2 sm:min-w-44">
                <button
                  type="button"
                  onClick={onProgress}
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.97] active:shadow-none"
                >
                  <Zap size={18} />
                  +1 推进一步
                </button>
                {recurringFrequency ? (
                  <button
                    type="button"
                    onClick={onCompleteRecurring}
                    className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.97] active:shadow-none"
                  >
                    <CheckCircle2 size={18} />
                    {recurringFrequency === "daily" ? "完成今日" : "完成本周"}
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty-focus" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex min-h-[196px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <Target className="mx-auto text-slate-400" size={28} />
              <p className="mt-2 text-sm font-medium text-slate-600">创建或选择一个 Quest</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function ProgressBurst({ result }: { result: ProgressResult }) {
  const taskClass = result.className;
  const baseColor = CLASS_META[taskClass].hexColor;
  const colors = [baseColor, "#22c55e", "#0ea5e9", "#f59e0b", "#fb7185"];
  const particleTypes = ["particle", "particle-star", "particle-diamond", "particle-ring"] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {Array.from({ length: 2 }).map((_, i) => (
        <motion.div key={`glow-${i}`} className="glow-burst" style={{ "--particle-color": baseColor } as CSSProperties}
          initial={{ left: "68%", top: "62%", width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: [0, 110 + i * 34], height: [0, 110 + i * 34], opacity: [0.5, 0], x: [0, -(55 + i * 17)], y: [0, -(55 + i * 17)] }}
          transition={{ duration: 0.62, ease: "easeOut", delay: i * 0.07 }} />
      ))}
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 16 + (index % 2 === 0 ? 0.15 : -0.15);
        const distance = 68 + (index % 4) * 14;
        return (
          <motion.span key={`outer-${index}`} className={particleTypes[index % particleTypes.length]}
            style={{ "--particle-color": colors[index % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0.3, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: [0.3, 1.4, 0.8], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotate: [0, 180 + index * 15] }}
            transition={{ duration: 0.9, ease: "easeOut" }} />
        );
      })}
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 8 + 0.3;
        const distance = 32 + (index % 3) * 10;
        return (
          <motion.span key={`inner-${index}`} className="particle-star"
            style={{ "--particle-color": colors[(index + 2) % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], scale: [0, 1.6, 0.4], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotate: [0, 360] }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.04 }} />
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.8, rotate: -3 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: [0.8, 1.12, 0.96, 1],
          rotate: [-3, 1, 0],
        }}
        exit={{ opacity: 0, y: -18, scale: 0.96 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute right-4 top-4 rounded-xl border border-emerald-200 bg-white px-5 py-4 shadow-lift"
      >
        <div className="text-base font-bold text-emerald-700">+1 Progress</div>
        <div className="mt-1 text-sm font-semibold text-slate-600">+{result.xpAwarded} XP</div>
        <div className="text-sm font-semibold text-violet-600">+{result.classXpAwarded} {CLASS_META[result.className].emoji} XP</div>
        {result.momentum >= 3 && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            🔥 Momentum x{result.momentum}
          </div>
        )}
        {result.newRegion && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
            🗺️ {result.newRegion}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function QuestProgressBadge({ progressCount }: { progressCount: number }) {
  const region = getMapRegion(progressCount);
  const nextStep = Number.isFinite(region.maxProgress) ? region.maxProgress + 1 : null;
  const regionProgress = nextStep
    ? Math.min(100, Math.round(((progressCount - region.minProgress + 1) / (region.maxProgress - region.minProgress + 1)) * 100))
    : 100;

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
      <span className="shrink-0">{region.emoji}</span>
      <span className="min-w-0 truncate">{region.name}</span>
      <span className="shrink-0 text-slate-400">·</span>
      <span className="shrink-0">区域 {regionProgress}%</span>
      {nextStep ? <span className="shrink-0 text-slate-400">下站 {nextStep}</span> : <span className="shrink-0 text-slate-400">传奇阶段</span>}
    </div>
  );
}

type QuestCardProps = {
  task: QuestTask;
  isFocus: boolean;
  isPulsing: boolean;
  onFocus: () => void;
  onProgress: () => void;
  onStatus: (status: QuestStatus) => void;
  onTagsChange: (tags: TaskTag[]) => void;
};

function QuestCard({ task, isFocus, isPulsing, onFocus, onProgress, onStatus, onTagsChange }: QuestCardProps) {
  const taskClass = getTaskClass(task);
  const toggleTaskTag = (tag: TaskTag) => {
    const nextTags = task.tags.includes(tag)
      ? task.tags.filter((item) => item !== tag)
      : [...task.tags, tag];
    onTagsChange(nextTags);
  };

  return (
    <motion.article
      layout
      animate={
        isPulsing
          ? { scale: [1, 1.035, 1], borderColor: ["#dde3eb", "#22c55e", "#dde3eb"] }
          : { scale: 1 }
      }
      whileHover={{ y: -2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isFocus ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"
      }`}
      style={{ borderLeftWidth: "4px", borderLeftColor: CLASS_META[taskClass].hexColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold" style={{ color: CLASS_META[taskClass].hexColor }}>{task.title}</h3>
            {isFocus && <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-semibold text-white">Focus</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${classStyles[taskClass]}`}>
              {CLASS_META[taskClass].emoji} {taskClass}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">{task.status}</span>
            {(task.tags ?? []).map((tag) => {
              const meta = TAG_META[tag];
              return (
                <span key={tag} className="rounded-full px-2 py-1 text-xs font-semibold" style={{ color: meta.textColor, backgroundColor: meta.bgColor }}>
                  {meta.label}
                </span>
              );
            })}
          </div>
          <div className="mt-3"><QuestProgressBadge progressCount={task.progressCount} /></div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Edit Tags</span>
            {(["important", "urgent", "daily", "weekly"] as TaskTag[]).map((tag) => {
              const meta = TAG_META[tag];
              const active = task.tags.includes(tag);
              return (
                <button
                  key={`${task.id}-${tag}`}
                  type="button"
                  onClick={() => toggleTaskTag(tag)}
                  className="rounded-full border px-2 py-1 text-[11px] font-black transition hover:-translate-y-0.5 active:scale-[0.96]"
                  style={{
                    color: active ? meta.textColor : "#64748b",
                    backgroundColor: active ? meta.bgColor : "#f8fafc",
                    borderColor: active ? meta.borderColor : "#e2e8f0"
                  }}
                >
                  {active ? "✓ " : "+ "}{meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <motion.div key={task.progressCount} initial={{ scale: 0.88, opacity: 0.45 }} animate={{ scale: 1, opacity: 1 }} className="shrink-0 text-right">
          <div className="text-3xl font-semibold text-slate-950">{task.progressCount}</div>
          <div className="text-xs font-medium text-slate-500">Progress</div>
        </motion.div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>最近更新 {relativeTime(task.updatedAt)}</span>
        {task.lastFocusedAt && <span>专注 {relativeTime(task.lastFocusedAt)}</span>}
        {task.status === "archived" && task.recurringCompletedAt ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
            上次完成 {formatDateTime(task.recurringCompletedAt)}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {task.status !== "archived" ? (
          <>
            <IconButton onClick={onFocus} label="Focus" title="Focus">
              <Target size={17} />
            </IconButton>
            <button
              type="button"
              onClick={onProgress}
              className="focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition hover:bg-emerald-600 active:scale-[0.97]"
            >
              <Zap size={17} /> +1
            </button>
            <IconButton
              onClick={() => onStatus(task.status === "paused" ? "active" : "paused")}
              label={task.status === "paused" ? "Resume" : "Pause"}
              title="Toggle pause"
            >
              {task.status === "paused" ? <Play size={17} /> : <Pause size={17} />}
            </IconButton>
            <IconButton onClick={() => onStatus("archived")} label="Archive" title="Archive">
              <Archive size={17} />
            </IconButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onStatus("active")}
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RotateCcw size={17} /> Restore
          </button>
        )}
      </div>
    </motion.article>
  );
}

type IconButtonProps = {
  onClick: () => void;
  title: string;
  label: string;
  children: ReactNode;
};

const iconButtonClass =
  "focus-ring grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-200 bg-white " +
  "text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.93] active:bg-slate-100";

function IconButton({ onClick, title, label, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={iconButtonClass}
      title={title}
      aria-label={label}
    >
      {children}
    </button>
  );
}

type FocusTodoPanelProps = {
  task?: QuestTask;
  title: string;
  setTitle: (title: string) => void;
  showCompleted: boolean;
  setShowCompleted: (showCompleted: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
  onToggle: (todoId: string) => void;
  onReorder: (todoId: string, targetTodoId: string) => void;
};

function FocusTodoPanel({
  task,
  title,
  setTitle,
  showCompleted,
  setShowCompleted,
  onSubmit,
  onCreate,
  onToggle,
  onReorder,
}: FocusTodoPanelProps) {
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const todos = task?.todos ?? [];
  const openTodos = todos.filter((todo) => !todo.completedAt);
  const completedTodos = todos.filter((todo) => todo.completedAt);
  const visibleCompleted = showCompleted ? completedTodos : [];
  const visibleTodos = [...openTodos, ...visibleCompleted];

  const dropTodo = (event: DragEvent, targetTodoId: string) => {
    event.preventDefault();
    if (!dragTodoId || dragTodoId === targetTodoId) return;
    onReorder(dragTodoId, targetTodoId);
    setDragTodoId(null);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Todo List</h2>
          <p className="mt-1 text-sm text-slate-500">
            {task ? `当前任务下的具体待办 · ${openTodos.length} 未完成` : "选择任务后添加待办"}
          </p>
        </div>
        {completedTodos.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            {showCompleted ? <ChevronUp size={14} /> : <EyeOff size={14} />}
            {showCompleted ? "折叠完成" : `完成 ${completedTodos.length}`}
          </button>
        ) : null}
      </div>

      {task ? (
        <>
          <form onSubmit={onSubmit} className="mb-4 flex gap-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="新增这个任务下的 Todo"
              className="focus-ring min-h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={!title.trim()}
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </form>

          {visibleTodos.length > 0 ? (
            <div className="space-y-2">
              {visibleTodos.map((todo) => {
                const completed = Boolean(todo.completedAt);
                const dragging = dragTodoId === todo.id;
                return (
                  <motion.div
                    key={todo.id}
                    layout
                    draggable
                    onDragStart={() => setDragTodoId(todo.id)}
                    onDragEnd={() => setDragTodoId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropTodo(event, todo.id)}
                    className={`focus-ring flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      completed
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-emerald-200 bg-emerald-50/70 text-slate-800 hover:bg-emerald-100"
                    } ${dragging ? "opacity-50 ring-2 ring-emerald-300" : ""}`}
                  >
                    <span className="mt-0.5 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing" aria-label="拖动排序">
                      <GripVertical size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(todo.id)}
                      className="mt-0.5 shrink-0 rounded-full text-left"
                      aria-label={completed ? "恢复 Todo" : "完成 Todo"}
                    >
                      {completed ? (
                        <CheckCircle2 size={17} className="text-slate-400" />
                      ) : (
                        <Circle size={17} className="text-emerald-600" />
                      )}
                    </button>
                    <span className={`min-w-0 flex-1 break-words ${completed ? "line-through" : ""}`}>{todo.title}</span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              还没有待办，把任务拆成下一步行动吧
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          创建或选择一个 Quest 后可添加 Todo
        </div>
      )}
    </section>
  );
}

function ProgressLogPanel({ logs, task }: { logs: ProgressLog[]; task?: QuestTask }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Progress Log</h2>
          <p className="mt-1 text-sm text-slate-500">{task ? task.title : "No focus quest"}</p>
        </div>
        <ChevronRight size={19} className="text-slate-400" />
      </div>
      {logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log) => (
            <motion.article
              key={log.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <time className="text-xs font-semibold text-slate-500">{formatLogTime(log.at)}</time>
                <div className="flex gap-2">
                  {log.type !== "scroll" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                      +{log.xpAwarded} XP
                    </span>
                  ) : null}
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                    {CLASS_META[log.className].emoji} {log.className}
                  </span>
                </div>
              </div>
              {log.todoTitle ? (
                <div className="mt-1 text-xs font-semibold text-emerald-700">
                  ✅ Todo 完成：{log.todoTitle}
                </div>
              ) : null}
              {log.progressTags && log.progressTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {log.progressTags.map((tag) => {
                    const color = PROGRESS_TAG_COLORS[tag.colorId] ?? PROGRESS_TAG_COLORS[DEFAULT_PROGRESS_TAG_COLOR];
                    return (
                      <span
                        key={`${log.id}-${tag.id}`}
                        className="rounded-full border px-2 py-0.5 text-[11px] font-black"
                        style={{ color: color.textColor, backgroundColor: color.bgColor, borderColor: color.borderColor }}
                      >
                        #{tag.name}
                      </span>
                    );
                  })}
                </div>
              ) : null}
              {log.skillCheck && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <span>🎲</span>
                  <span
                    className={
                      log.skillCheck.success
                        ? "text-emerald-600 font-medium"
                        : "text-red-500 font-medium"
                    }
                  >
                    Lv{log.skillCheck.classLevel ?? 1} {log.skillCheck.skillName}{" "}
                    {log.skillCheck.critical ? "大成功" : log.skillCheck.success ? "成功" : "失败"}
                    {` · DC ${log.skillCheck.dc} · 投骰 ${log.skillCheck.roll}+${
                      log.skillCheck.modifier
                    }=${log.skillCheck.roll + log.skillCheck.modifier}`}
                    {log.skillCheck.advantageTriggered
                      ? ` · 等级优势(${log.skillCheck.naturalRolls?.join("/") ?? log.skillCheck.roll})`
                      : ""}
                  </span>
                </div>
              )}
              {log.scrollEarned && (
                <div className="mt-1 text-xs font-semibold text-amber-700">
                  📜 {log.scrollEarned}
                  {log.scrollCount && log.scrollCount > 0
                    ? ` x${log.scrollCount}`
                    : log.scrollCount === -1
                      ? " 消耗 1"
                      : ""}
                </div>
              )}
              {log.newSkill ? (
                <div className="mt-1 text-xs font-semibold text-violet-700">
                  ✨ 习得 {log.newSkill}
                </div>
              ) : null}
              {log.skillUpgrade ? (
                <div className="mt-1 text-xs font-semibold text-sky-700">
                  ⬆️ {log.skillUpgrade.name} → {log.skillUpgrade.toTier}环
                </div>
              ) : null}
              <p className="mt-2 break-words text-sm font-medium text-slate-900">{log.note}</p>
              {log.type !== "scroll" ? (
                <p className="mt-2 text-xs text-slate-500">Progress {log.progressCount}</p>
              ) : null}
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
          <div>
            <Zap className="mx-auto text-slate-400" size={28} />
            <p className="mt-2 text-sm font-medium text-slate-600">推进后会记录到这里</p>
          </div>
        </div>
      )}
    </section>
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

function FeatChoiceModal({ choice, onClose, onSelect }: { choice: PendingFeatChoice; onClose: (choiceId: string) => void; onSelect: (choiceId: string, featId: string) => void }) {
  const meta = CLASS_META[choice.className];
  const [selectedFeatId, setSelectedFeatId] = useState<string | null>(null);
  const selectedFeat = selectedFeatId ? FEAT_MAP[selectedFeatId] : null;
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl" initial={{ opacity: 0, y: 28, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}>
        <div className="bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 text-center">
          <div className="text-sm font-black uppercase tracking-[0.24em] text-amber-500">Feat Point Unlocked</div>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{meta.emoji} {choice.className} Lv{choice.level} 专长选择</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">先点选一个专长，再点击底部确认。也可以稍后在 Build 页面选择。</p>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-3">
          {choice.choices.map((featId) => {
            const feat = FEAT_MAP[featId];
            const flow = FEAT_FLOW_META[feat.flow];
            const quality = FEAT_QUALITY_META[feat.quality];
            const selected = selectedFeatId === feat.id;
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => setSelectedFeatId(feat.id)}
                className={`group rounded-3xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-lift active:scale-[0.98] ${selected ? "border-amber-400 ring-4 ring-amber-100" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-3xl">{feat.emoji}</div>
                  <span className="rounded-full px-2 py-1 text-xs font-black" style={{ backgroundColor: `${quality.color}1A`, color: quality.color }}>
                    {quality.emoji} {quality.label}
                  </span>
                </div>
                <div className="mt-3 text-xl font-black text-slate-950">{feat.name}</div>
                <div className="mt-1 text-xs font-black" style={{ color: flow.color }}>{flow.emoji} {flow.label}</div>
                <p className="mt-3 text-sm font-bold text-slate-700">{feat.summary}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{feat.detail}</p>
                <div className={`mt-4 rounded-2xl px-3 py-2 text-center text-sm font-black transition ${selected ? "bg-amber-500 text-white" : "bg-slate-950 text-white opacity-0 group-hover:opacity-100"}`}>
                  {selected ? "已选中，等待确认" : "点选此专长"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold text-slate-500">
            {selectedFeat ? `将永久选择：${selectedFeat.emoji} ${selectedFeat.name}` : "未选择前不会写入存档。"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/build" onClick={() => onClose(choice.id)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]">去 Build 页面</Link>
            <button type="button" onClick={() => onClose(choice.id)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]">稍后再选</button>
            <button type="button" disabled={!selectedFeatId} onClick={() => selectedFeatId && onSelect(choice.id, selectedFeatId)} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">
              确认选择（永久）
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NormalResonanceEffect({ resonance }: { resonance: ResonanceTrigger }) {
  const [firstClass, secondClass] = resonance.classes;
  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-8 z-40 mx-auto w-72 rounded-3xl border border-purple-200 bg-white/95 p-4 shadow-2xl backdrop-blur will-change-transform"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-100/70 via-white/0 to-amber-100/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <div className="relative">
        <div className="flex items-center justify-center gap-8 text-3xl">
          <motion.span animate={{ x: [0, 16, 12], scale: [1, 1.08, 1] }} transition={{ duration: 0.52, ease: "easeOut" }}>{CLASS_META[firstClass].emoji}</motion.span>
          <motion.span animate={{ x: [0, -16, -12], scale: [1, 1.08, 1] }} transition={{ duration: 0.52, ease: "easeOut" }}>{CLASS_META[secondClass].emoji}</motion.span>
        </div>
        <motion.div className="mt-1 text-center text-xl font-black text-purple-600" initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.16, duration: 0.24, ease: "easeOut" }}>
          ✨ 职业共鸣
        </motion.div>
        <motion.div className="mt-1 text-center" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.22, ease: "easeOut" }}>
          <div className="text-lg font-black text-slate-950">{resonance.reward.emoji} {resonance.name}</div>
          <div className="text-sm font-bold text-amber-700">{resonance.reward.shortLabel}</div>
          {resonance.leveledUp ? <div className="mt-1 text-xs font-bold text-violet-600">✨ 共鸣升级 Lv{resonance.previousLevel} → Lv{resonance.level}</div> : null}
          {resonance.chainCount > 1 ? <div className="mt-1 text-xs font-black text-fuchsia-600">⚡ 共鸣链 x{resonance.chainCount}{resonance.chainBonus ? " · 额外卷轴 ×1" : ""}</div> : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

function NewResonanceModal({ resonance, discoveredCount, onClose }: { resonance: ResonanceTrigger; discoveredCount: number; onClose: () => void }) {
  const [firstClass, secondClass] = resonance.classes;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white p-6 text-center shadow-2xl"
        initial={{ opacity: 0, scale: 0.82, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-violet-100/80 via-transparent to-amber-100/80"
          animate={{ opacity: [0.5, 0.9, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <div className="relative">
          <div className="font-mono text-xs font-black tracking-[0.18em] text-violet-400">═══════════════</div>
          <div className="text-sm font-black tracking-[0.25em] text-violet-500">✨ 新共鸣发现</div>
          <div className="font-mono text-xs font-black tracking-[0.18em] text-violet-400">═══════════════</div>
          <div className="mt-5 flex items-center justify-center gap-6">
            {[firstClass, secondClass].map((cn, index) => (
              <motion.div
                key={cn}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-3xl border bg-white shadow-lg"
                style={{ borderColor: CLASS_META[cn].hexColor }}
                initial={{ x: index === 0 ? -80 : 80, opacity: 0, rotate: index === 0 ? -12 : 12 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.12 + index * 0.08, type: "spring", stiffness: 180, damping: 14 }}
              >
                <span className="text-3xl">{CLASS_META[cn].emoji}</span>
                <span className="mt-1 text-xs font-bold text-slate-600">{cn}</span>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="mt-4 text-4xl"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0.75], scale: [0.4, 1.5, 1], rotate: [0, 10, 0] }}
            transition={{ delay: 0.34, duration: 0.38 }}
          >
            ⚡
          </motion.div>
          <motion.h2
            className="mt-2 text-3xl font-black text-slate-950"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: [0.85, 1.08, 1] }}
            transition={{ delay: 0.52, duration: 0.45 }}
          >
            {resonance.reward.emoji} {resonance.name}
          </motion.h2>
          <div className="mt-3 inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            奖励：{resonance.reward.emoji} {resonance.reward.shortLabel}
          </div>
          <p className="mt-3 text-sm font-bold text-emerald-600">已收录至共鸣圣殿 · 进度 {discoveredCount} / 66</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">{resonance.description}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/resonance"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              查看详情
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              继续冒险
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FocusChangedOverlay() {
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto flex w-fit items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.18 }}>
      <Target size={17} /> Focus Changed
    </motion.div>
  );
}

function QuestCreatedOverlay({ title }: { title: string }) {
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 top-32 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.18 }}>
      <CheckCircle2 size={17} />
      <span className="min-w-0 truncate">Quest Created · {title}</span>
    </motion.div>
  );
}

function MilestoneOverlay({ result }: { result: ProgressResult }) {
  const colors = ["#f59e0b", "#fb7185", "#a78bfa", "#22c55e", "#0ea5e9", "#14b8a6"];
  return (
    <motion.div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-slate-950/10 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
      {Array.from({ length: 30 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 30;
        const distance = 100 + (index % 5) * 30;
        const shapes = ["particle", "particle-star", "particle-diamond"] as const;
        return (
          <motion.span key={`firework-${index}`} className={shapes[index % shapes.length]}
            style={{ "--particle-color": colors[index % colors.length] } as CSSProperties}
            initial={{ left: "50%", top: "50%", opacity: 1, scale: 0.2, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: [0.2, 1.6, 0.5], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotate: [0, 360] }}
            transition={{ duration: 1.3, ease: "easeOut" }} />
        );
      })}
      {/* Confetti rain falling from top */}
      {Array.from({ length: 20 }).map((_, i) => {
        const startX = 10 + (i / 20) * 80;
        const drift = ((i % 7) - 3) * 25;
        const shapes = ["particle", "particle-star", "particle-diamond", "particle-ring"] as const;
        return (
          <motion.span key={`confetti-${i}`} className={shapes[i % shapes.length]}
            style={{ "--particle-color": colors[i % colors.length] } as CSSProperties}
            initial={{ left: `${startX}%`, top: "-5%", opacity: 1, scale: 0.6 + (i % 4) * 0.15, rotate: 0 }}
            animate={{ top: "110%", opacity: [1, 1, 0.8, 0], x: drift, rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)] }}
            transition={{ duration: 2.2 + (i % 5) * 0.15, ease: "linear", delay: 0.4 + (i % 8) * 0.06 }} />
        );
      })}
      <motion.div className="rounded-2xl border-2 border-amber-200 bg-white px-8 py-6 text-center shadow-lift"
        initial={{ scale: 0.5, y: 30, rotate: -5 }} animate={{ scale: [0.5, 1.15, 0.95, 1], y: 0, rotate: [-5, 2, 0] }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
        <motion.div animate={{ rotate: [0, -10, 10, -5, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Trophy className="mx-auto text-amber-500" size={42} />
        </motion.div>
        <div className="mt-3 text-2xl font-bold text-slate-950">已推进 {result.milestone} 次</div>
        <div className="mt-2 text-base font-semibold text-amber-600">Milestone +{result.xpAwarded} XP</div>
      </motion.div>
    </motion.div>
  );
}

function LongRestSummaryModal({ summary, onClose }: { summary: LongRestSummary; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 text-center">
          <Tent className="mx-auto text-emerald-500" size={36} />
          <h2 className="mt-2 text-2xl font-bold text-slate-950">🏕 今日冒险总结</h2>
          <p className="text-sm text-slate-500">{summary.date}</p>
        </div>

        <div className="space-y-3">
          {classNames.map((cn) => {
            const meta = CLASS_META[cn];
            const cs = summary.classSummaries[cn];
            if (cs.progressCount === 0 && cs.xpGained === 0) return null;
            return (
              <div key={cn} className={`rounded-xl border-2 p-4 ${meta.borderColor} ${meta.bgColor}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <h3 className={`text-lg font-bold ${meta.color}`}>{cn}（{meta.label}）</h3>
                    <p className="text-xs text-slate-500">+{cs.progressCount} Progress · +{cs.xpGained} XP{cs.scrollsEarned > 0 ? ` · 📜 x${cs.scrollsEarned}` : ""}</p>
                  </div>
                </div>
                {cs.skillEvents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cs.skillEvents.map((evt, i) => (
                      <span key={i} className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-violet-700">⬆️ {evt}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-950">{summary.totalXp}</div>
            <div className="text-xs text-slate-500">总经验</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{summary.totalScrolls}</div>
            <div className="text-xs text-slate-500">总卷轴</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">🔥 {summary.streak}</div>
            <div className="text-xs text-slate-500">连续天数</div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-950 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            开启下一轮冒险
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
