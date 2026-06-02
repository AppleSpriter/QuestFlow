"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cloud,
  Coffee,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Target,
  Tent,
  Trophy,
  Zap
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getLevelProgress,
  type ProgressResult,
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
import { TaskMapProgress } from "@/components/TaskMapProgress";
import { SkillCheckToast, type SkillCheckInfo } from "@/components/SkillCheckToast";
import { Spellbook } from "@/components/Spellbook";

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
  Cleric: "border-sky-200 bg-sky-50 text-sky-800"
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

const regionBackgrounds: Record<string, string> = {
  camp: "linear-gradient(180deg, #faf9f7 0%, #f0ece6 50%, #e8e2d8 100%)",
  forest: "linear-gradient(180deg, #f0f9f0 0%, #ddf0dd 50%, #c8e6c8 100%)",
  canyon: "linear-gradient(180deg, #f5f0f8 0%, #e8ddf0 50%, #d5c8e0 100%)",
  tower: "linear-gradient(180deg, #f0f4fa 0%, #dde5f0 50%, #c8d5e8 100%)",
  stars: "linear-gradient(180deg, #f8f5ff 0%, #ede5f8 50%, #ddd0f0 100%)"
};

const classNames: ClassName[] = ["Wizard", "Fighter", "Rogue", "Bard", "Cleric"];

function buildLongRestSummary(
  logs: Array<{ at: string; classXpAwarded: number; scrollEarned?: string; scrollCount?: number; skillUpgrade?: { name: string; fromTier: number; toTier: number; className: ClassName } }>,
  classStates: Record<ClassName, { xp: number; scrolls: number; skills: { lineId: string; currentTier: number }[] }>,
  streakCount: number
): LongRestSummary {
  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" }).format(new Date());
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((l) => new Date(l.at) >= todayStart);

  const classSummaries: LongRestSummary["classSummaries"] = {} as LongRestSummary["classSummaries"];
  let totalXp = 0;
  let totalScrolls = 0;

  for (const cn of classNames) {
    const cnLogs = todayLogs.filter((l) => {
      // approximate: logs don't store className directly, use scrollType or skillUpgrade
      return l.scrollEarned === CLASS_META[cn].scrollName || l.skillUpgrade?.className === cn;
    });
    const xpGained = cnLogs.reduce((sum, l) => sum + l.classXpAwarded, 0);
    const scrollsEarned = cnLogs.reduce((sum, l) => sum + (l.scrollCount ?? 0), 0);
    const skillEvents = cnLogs.filter((l) => l.skillUpgrade).map((l) => l.skillUpgrade ? `${l.skillUpgrade.name} → ${l.skillUpgrade.toTier}环` : "");

    classSummaries[cn] = { progressCount: cnLogs.length, xpGained, scrollsEarned, skillEvents };
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
  const addTask = useQuestStore((state) => state.addTask);
  const setFocusTask = useQuestStore((state) => state.setFocusTask);
  const updateTaskStatus = useQuestStore((state) => state.updateTaskStatus);
  const progressTask = useQuestStore((state) => state.progressTask);

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassName>("Wizard");
  const [statusFilter, setStatusFilter] = useState<QuestStatus>("active");
  const [progressNote, setProgressNote] = useState("");
  const [lastProgress, setLastProgress] = useState<ProgressResult | null>(null);
  const [pulseTaskId, setPulseTaskId] = useState<string | null>(null);
  const [focusFlash, setFocusFlash] = useState(false);
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

  useEffect(() => { setMounted(true); }, []);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === "active"), [tasks]);
  const visibleTasks = useMemo(() => tasks.filter((t) => t.status === statusFilter), [statusFilter, tasks]);
  const focusTask = useMemo(() => tasks.find((t) => t.id === focusTaskId && t.status !== "archived"), [focusTaskId, tasks]);
  const focusLogs = useMemo(() => logs.filter((l) => l.taskId === focusTask?.id).slice(0, 8), [focusTask?.id, logs]);
  const level = getLevelProgress(totalXp);

  const focusRegionId = focusTask ? getMapRegion(focusTask.progressCount).id : "camp";
  const focusBg = regionBackgrounds[focusRegionId] ?? regionBackgrounds.camp;

  const createQuest = () => {
    const newTaskId = addTask(title, selectedClass, selectedTags);
    if (!newTaskId) return;
    setTitle("");
    setSelectedTags([]);
    setStatusFilter("active");
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

  const pushProgress = useCallback((taskId: string, note?: string) => {
    const result = progressTask(taskId, note);
    if (!result) return;

    enqueueProgress(result);

    if (result.skillCheck) {
      enqueueSkillCheck({
        check: result.skillCheck,
        scrollEarned: result.scrollEarned,
        scrollCount: result.scrollCount,
        newSkill: result.newSkill,
        skillUpgrade: result.skillUpgrade ? { ...result.skillUpgrade, className: result.skillCheck.className } : undefined,
        synergyBonus: result.synergyBonus
      });
    }
  }, [enqueueProgress, enqueueSkillCheck, progressTask]);

  const pushFocusProgress = () => {
    if (!focusTask) return;
    pushProgress(focusTask.id, progressNote);
    setProgressNote("");
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
      animate={{ background: focusBg }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    >
      <AnimatePresence>
        {focusFlash ? <FocusChangedOverlay /> : null}
        {celebration ? <MilestoneOverlay result={celebration} /> : null}
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
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {ALL_CLASSES.map((cn) => {
          const meta = CLASS_META[cn];
          const cs = classStates[cn];
          const lvl = getClassLevel(cs.xp);
          const currentXp = cs.xp % 100;
          const xpPercent = Math.min(100, currentXp);
          const scrollCount = cs.scrolls;
          const skillCount = cs.skills.length;
          const fatigueStage = getFatigueStage(cs.fatigue);
          const stageMeta = FATIGUE_STAGE_META[fatigueStage];
          return (
            <div key={cn} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${classStyles[cn]}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span>{meta.emoji}</span>
                  <span className="truncate">{cn} Lv{lvl}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-70">
                  {scrollCount > 0 && <span>📜{scrollCount}</span>}
                  {skillCount > 0 && <span>✨{skillCount}</span>}
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
                    animate={{ width: `${cs.fatigue}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
                <span className="shrink-0 text-[10px] opacity-70">{cs.fatigue}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowSpellbook(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          <BookOpen size={16} />
          Spellbook
        </button>
        {restState ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            {restState.type === "short" ? <Coffee size={16} /> : <Tent size={16} />}
            {restState.type === "short" ? "短休中" : "长休中"}
            {restCountdown !== null && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold">{Math.floor(restCountdown / 60)}:{String(restCountdown % 60).padStart(2, "0")}</span>
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
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <Coffee size={16} />
              短休 {SHORT_REST_MINUTES}min
            </button>
            <button
              type="button"
              onClick={startLongRest}
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Tent size={16} />
              长休 {LONG_REST_MINUTES}min
            </button>
          </>
        )}
        <div className="flex-1" />
        <Link
          href="/sync"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
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
                  {(["important", "urgent"] as TaskTag[]).map((tag) => {
                    const meta = TAG_META[tag];
                    const active = selectedTags.includes(tag);
                    const bonus = tag === "important" ? 3 : 2;
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
                        {meta.label} {active ? `+${bonus} XP` : ""}
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
            onProgress={pushFocusProgress}
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
                    className={`inline-flex max-w-[180px] items-center gap-1.5 truncate rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                      isCurrent
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    style={isCurrent ? undefined : { color: CLASS_META[tc].hexColor, borderColor: CLASS_META[tc].hexColor + "40" }}
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
                  />
                ))}
              </div>
            ) : (
              <EmptyState status={statusFilter} />
            )}
          </section>
        </section>

        <aside className="min-w-0">
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

function FocusPanel({ task, note, setNote, onProgress, lastProgress, isPulsing }: {
  task?: QuestTask; note: string; setNote: (v: string) => void; onProgress: () => void;
  lastProgress: ProgressResult | null; isPulsing: boolean;
}) {
  const taskClass = task ? getTaskClass(task) : "Wizard";

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
                <h2 className="break-words text-3xl font-semibold sm:text-4xl" style={{ color: CLASS_META[taskClass].hexColor }}>{task.title}</h2>
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
            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onProgress(); }}
                placeholder="备注这一步推进了什么，⌘+Enter 提交"
                rows={2}
                className="focus-ring min-h-12 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-950 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={onProgress}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                <Zap size={18} />
                +1 推进一步
              </button>
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
  const colors = ["#22c55e", "#0ea5e9", "#f59e0b", "#fb7185", "#a78bfa", "#14b8a6"];
  const particleTypes = ["particle", "particle-star", "particle-diamond", "particle-ring"] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div key={`glow-${i}`} className="glow-burst" style={{ "--particle-color": colors[i % colors.length] } as CSSProperties}
          initial={{ left: "68%", top: "62%", width: 0, height: 0, opacity: 0.6 }}
          animate={{ width: [0, 120 + i * 40], height: [0, 120 + i * 40], opacity: [0.6, 0], x: [0, -(60 + i * 20)], y: [0, -(60 + i * 20)] }}
          transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }} />
      ))}
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 24 + (index % 2 === 0 ? 0.15 : -0.15);
        const distance = 75 + (index % 6) * 14;
        return (
          <motion.span key={`outer-${index}`} className={particleTypes[index % particleTypes.length]}
            style={{ "--particle-color": colors[index % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0.3, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: [0.3, 1.4, 0.8], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotate: [0, 180 + index * 15] }}
            transition={{ duration: 0.9, ease: "easeOut" }} />
        );
      })}
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 12 + 0.3;
        const distance = 35 + (index % 3) * 12;
        return (
          <motion.span key={`inner-${index}`} className="particle-star"
            style={{ "--particle-color": colors[(index + 2) % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [1, 1, 0], scale: [0, 1.6, 0.4], x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotate: [0, 360] }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.05 }} />
        );
      })}

      <motion.div initial={{ opacity: 0, y: 18, scale: 0.8, rotate: -3 }} animate={{ opacity: 1, y: 0, scale: [0.8, 1.12, 0.96, 1], rotate: [-3, 1, 0] }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute right-4 top-4 rounded-xl border border-emerald-200 bg-white px-5 py-4 shadow-lift">
        <div className="text-base font-bold text-emerald-700">+1 Progress</div>
        <div className="mt-1 text-sm font-semibold text-slate-600">+{result.xpAwarded} XP</div>
        <div className="text-sm font-semibold text-violet-600">+{result.classXpAwarded} {CLASS_META[result.skillCheck?.className ?? "Wizard"].emoji} XP</div>
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

function QuestCard({ task, isFocus, isPulsing, onFocus, onProgress, onStatus }: {
  task: QuestTask; isFocus: boolean; isPulsing: boolean; onFocus: () => void; onProgress: () => void; onStatus: (s: QuestStatus) => void;
}) {
  const taskClass = getTaskClass(task);

  return (
    <motion.article layout animate={isPulsing ? { scale: [1, 1.035, 1], borderColor: ["#dde3eb", "#22c55e", "#dde3eb"] } : { scale: 1 }} whileHover={{ y: -2 }} transition={{ duration: 0.55, ease: "easeOut" }}
      className={`rounded-lg border bg-white p-4 shadow-sm ${isFocus ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"}`}>
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
          <div className="mt-2"><TaskMapProgress progressCount={task.progressCount} /></div>
        </div>
        <motion.div key={task.progressCount} initial={{ scale: 0.88, opacity: 0.45 }} animate={{ scale: 1, opacity: 1 }} className="shrink-0 text-right">
          <div className="text-3xl font-semibold text-slate-950">{task.progressCount}</div>
          <div className="text-xs font-medium text-slate-500">Progress</div>
        </motion.div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>最近更新 {relativeTime(task.updatedAt)}</span>
        {task.lastFocusedAt && <span>专注 {relativeTime(task.lastFocusedAt)}</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {task.status !== "archived" ? (
          <>
            <IconButton onClick={onFocus} label="Focus" title="Focus"><Target size={17} /></IconButton>
            <button type="button" onClick={onProgress} className="focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition hover:bg-emerald-600">
              <Zap size={17} /> +1
            </button>
            <IconButton onClick={() => onStatus(task.status === "paused" ? "active" : "paused")} label={task.status === "paused" ? "Resume" : "Pause"} title="Toggle pause">
              {task.status === "paused" ? <Play size={17} /> : <Pause size={17} />}
            </IconButton>
            <IconButton onClick={() => onStatus("archived")} label="Archive" title="Archive"><Archive size={17} /></IconButton>
          </>
        ) : (
          <button type="button" onClick={() => onStatus("active")} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            <RotateCcw size={17} /> Restore
          </button>
        )}
      </div>
    </motion.article>
  );
}

function IconButton({ onClick, title, label, children }: { onClick: () => void; title: string; label: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" title={title} aria-label={label}>
      {children}
    </button>
  );
}

function ProgressLogPanel({ logs, task }: { logs: Array<{ id: string; note: string; at: string; xpAwarded: number; classXpAwarded: number; progressCount: number; skillCheck?: { success: boolean; critical: boolean; skillName: string; className: ClassName; classLevel?: number; dc: number; roll: number; modifier: number; advantageTriggered?: boolean; naturalRolls?: number[]; scrollCount?: number }; scrollEarned?: string; scrollCount?: number }>; task?: QuestTask }) {
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
            <motion.article key={log.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <time className="text-xs font-semibold text-slate-500">{formatLogTime(log.at)}</time>
                <div className="flex gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">+{log.xpAwarded} XP</span>
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">+{log.classXpAwarded} {CLASS_META[log.skillCheck?.className ?? "Wizard"].emoji}</span>
                </div>
              </div>
              {log.skillCheck && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <span>🎲</span>
                  <span className={log.skillCheck.success ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                    Lv{log.skillCheck.classLevel ?? 1} {log.skillCheck.skillName} {log.skillCheck.critical ? "大成功" : log.skillCheck.success ? "成功" : "失败"}
                    {` · DC ${log.skillCheck.dc} · 投骰 ${log.skillCheck.roll}+${log.skillCheck.modifier}=${log.skillCheck.roll + log.skillCheck.modifier}`}
                    {log.skillCheck.advantageTriggered ? ` · 等级优势(${log.skillCheck.naturalRolls?.join("/") ?? log.skillCheck.roll})` : ""}
                  </span>
                </div>
              )}
              {log.scrollEarned && (
                <div className="mt-1 text-xs font-semibold text-amber-700">
                  📜 {log.scrollEarned}{log.scrollCount && log.scrollCount > 1 ? ` x${log.scrollCount}` : ""}
                </div>
              )}
              <p className="mt-2 break-words text-sm font-medium text-slate-900">{log.note}</p>
              <p className="mt-2 text-xs text-slate-500">Progress {log.progressCount}</p>
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

function FocusChangedOverlay() {
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto flex w-fit items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.18 }}>
      <Target size={17} /> Focus Changed
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
