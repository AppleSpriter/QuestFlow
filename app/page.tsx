"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ChevronRight,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  type AgentName,
  getLevelProgress,
  type ProgressResult,
  type QuestStatus,
  type QuestTask,
  useQuestStore
} from "@/lib/quest-store";

const agents: AgentName[] = ["Codex", "openclaw", "Claude Code", "Gemini", "dodo", "None"];

const statusTabs: Array<{ id: QuestStatus; label: string }> = [
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "archived", label: "Archived" }
];

const agentStyles: Record<AgentName, string> = {
  Codex: "border-emerald-200 bg-emerald-50 text-emerald-800",
  openclaw: "border-violet-200 bg-violet-50 text-violet-800",
  "Claude Code": "border-amber-200 bg-amber-50 text-amber-800",
  Gemini: "border-rose-200 bg-rose-50 text-rose-800",
  dodo: "border-teal-200 bg-teal-50 text-teal-800",
  None: "border-slate-200 bg-slate-50 text-slate-700"
};

const relativeTime = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "刚刚";
  }

  if (diff < hour) {
    return `${Math.floor(diff / minute)} 分钟前`;
  }

  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }

  return `${Math.floor(diff / day)} 天前`;
};

const formatLogTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));

export default function QuestFlowPage() {
  const tasks = useQuestStore((state) => state.tasks);
  const logs = useQuestStore((state) => state.logs);
  const focusTaskId = useQuestStore((state) => state.focusTaskId);
  const xp = useQuestStore((state) => state.xp);
  const streak = useQuestStore((state) => state.streak);
  const addTask = useQuestStore((state) => state.addTask);
  const setFocusTask = useQuestStore((state) => state.setFocusTask);
  const updateTaskStatus = useQuestStore((state) => state.updateTaskStatus);
  const progressTask = useQuestStore((state) => state.progressTask);

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [agent, setAgent] = useState<AgentName>("openclaw");
  const [statusFilter, setStatusFilter] = useState<QuestStatus>("active");
  const [progressNote, setProgressNote] = useState("");
  const [lastProgress, setLastProgress] = useState<ProgressResult | null>(null);
  const [pulseTaskId, setPulseTaskId] = useState<string | null>(null);
  const [focusFlash, setFocusFlash] = useState(false);
  const [celebration, setCelebration] = useState<ProgressResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "active"),
    [tasks]
  );
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.status === statusFilter),
    [statusFilter, tasks]
  );
  const focusTask = useMemo(
    () => tasks.find((task) => task.id === focusTaskId && task.status !== "archived"),
    [focusTaskId, tasks]
  );
  const focusLogs = useMemo(
    () => logs.filter((log) => log.taskId === focusTask?.id).slice(0, 8),
    [focusTask?.id, logs]
  );
  const level = getLevelProgress(xp);

  const createQuest = () => {
    const newTaskId = addTask(title, agent);

    if (!newTaskId) {
      return;
    }

    setTitle("");
    setStatusFilter("active");
    if (!focusTaskId) {
      setFocusFlash(true);
      window.setTimeout(() => setFocusFlash(false), 320);
    }
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createQuest();
  };

  const changeFocus = (taskId: string) => {
    if (taskId === focusTaskId) {
      return;
    }

    setFocusTask(taskId);
    setFocusFlash(true);
    window.setTimeout(() => setFocusFlash(false), 320);
  };

  const pushProgress = (taskId: string, note?: string) => {
    const result = progressTask(taskId, note);

    if (!result) {
      return;
    }

    setLastProgress(result);
    setPulseTaskId(taskId);
    window.setTimeout(() => setPulseTaskId(null), 760);
    window.setTimeout(() => setLastProgress(null), 1200);

    if (result.milestone) {
      setCelebration(result);
      window.setTimeout(() => setCelebration(null), 1150);
    }
  };

  const pushFocusProgress = () => {
    if (!focusTask) {
      return;
    }

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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <AnimatePresence>
        {focusFlash ? <FocusChangedOverlay /> : null}
        {celebration ? <MilestoneOverlay result={celebration} /> : null}
      </AnimatePresence>

      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <h1 className="text-2xl font-semibold text-slate-950">QuestFlow</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Progress Tracker for agent-heavy work</p>
        </div>

        <section className="grid grid-cols-3 gap-2 sm:min-w-[440px]">
          <Metric label={`Level ${level.level}`} value={`${level.current} / ${level.required} XP`}>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400"
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

      <form
        onSubmit={submitTask}
        className="mb-5 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      >
        <label className="sr-only" htmlFor="quest-title">
          新建任务
        </label>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
          <Plus size={17} className="shrink-0 text-slate-500" />
          <textarea
            id="quest-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                createQuest();
              }
            }}
            placeholder="新增 Quest，⌘+Enter 创建"
            rows={1}
            className="focus-ring min-h-11 w-full resize-none bg-transparent text-sm text-slate-950 placeholder:text-slate-400"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Agent</span>
          {agents.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAgent(item)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                agent === item
                  ? agentStyles[item]
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {item === "None" ? "No Agent" : item}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="submit"
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!title.trim()}
            title="Create quest"
          >
            <Plus size={17} />
            Create
          </button>
        </div>
      </form>

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

          <section className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`focus-ring rounded-md px-3 py-2 text-sm font-medium transition ${
                      statusFilter === tab.id
                        ? "bg-slate-950 text-white"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-sm text-slate-500">
                {visibleTasks.length} {visibleTasks.length === 1 ? "quest" : "quests"}
              </span>
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
                    onStatus={(status) => updateTaskStatus(task.id, status)}
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
    </main>
  );
}

function Metric({
  label,
  value,
  children
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950 sm:text-base">{value}</div>
      {children}
    </div>
  );
}

function FocusPanel({
  task,
  note,
  setNote,
  onProgress,
  lastProgress,
  isPulsing
}: {
  task?: QuestTask;
  note: string;
  setNote: (value: string) => void;
  onProgress: () => void;
  lastProgress: ProgressResult | null;
  isPulsing: boolean;
}) {
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
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${agentStyles[task.agent]}`}>
            {task.agent === "None" ? "No Agent" : task.agent}
          </span>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {task ? (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 42 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -42 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-3xl font-semibold text-slate-950 sm:text-4xl">
                  {task.title}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                  <span>Progress {task.progressCount}</span>
                  <span>最近更新 {relativeTime(task.updatedAt)}</span>
                  {task.status === "paused" ? <span>Paused</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-baseline gap-2">
                <motion.span
                  key={task.progressCount}
                  initial={{ y: -10, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className="text-5xl font-semibold text-slate-950"
                >
                  {task.progressCount}
                </motion.span>
                <span className="text-sm font-medium text-slate-500">steps</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    onProgress();
                  }
                }}
                placeholder="备注这一步推进了什么，⌘+Enter 提交"
                rows={2}
                className="focus-ring min-h-12 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-950 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={onProgress}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                title="Progress +1"
              >
                <Zap size={18} />
                +1 推进一步
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty-focus"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex min-h-[196px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center"
          >
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
      {/* Glowing background burst */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`glow-${i}`}
          className="glow-burst"
          style={{ "--particle-color": colors[i % colors.length] } as CSSProperties}
          initial={{ left: "68%", top: "62%", width: 0, height: 0, opacity: 0.6 }}
          animate={{
            width: [0, 120 + i * 40],
            height: [0, 120 + i * 40],
            opacity: [0.6, 0],
            x: [0, -(60 + i * 20)],
            y: [0, -(60 + i * 20)]
          }}
          transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }}
        />
      ))}

      {/* Fast outer ring of particles */}
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 24 + (index % 2 === 0 ? 0.15 : -0.15);
        const distance = 75 + (index % 6) * 14;
        const type = particleTypes[index % particleTypes.length];

        return (
          <motion.span
            key={`outer-${index}`}
            className={type}
            style={{ "--particle-color": colors[index % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0.3, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: [0.3, 1.4, 0.8],
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              rotate: [0, 180 + index * 15]
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        );
      })}

      {/* Slow inner sparkles */}
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 12 + 0.3;
        const distance = 35 + (index % 3) * 12;

        return (
          <motion.span
            key={`inner-${index}`}
            className="particle-star"
            style={{ "--particle-color": colors[(index + 2) % colors.length] } as CSSProperties}
            initial={{ left: "68%", top: "62%", opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0, 1.6, 0.4],
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              rotate: [0, 360]
            }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.05 }}
          />
        );
      })}

      {/* Rising sparkles */}
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.span
          key={`rise-${index}`}
          className="particle-diamond"
          style={{ "--particle-color": colors[(index + 4) % colors.length] } as CSSProperties}
          initial={{ left: `${58 + index * 4}%`, top: "58%", opacity: 1, scale: 0.5, y: 0 }}
          animate={{
            opacity: 0,
            scale: [0.5, 1.8, 0.3],
            y: [0, -80 - index * 10],
            rotate: [0, index % 2 === 0 ? 180 : -180]
          }}
          transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.04 }}
        />
      ))}

      {/* Result card with bounce */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.8, rotate: -3 }}
        animate={{ opacity: 1, y: 0, scale: [0.8, 1.12, 0.96, 1], rotate: [-3, 1, 0] }}
        exit={{ opacity: 0, y: -18, scale: 0.96 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute right-4 top-4 rounded-xl border border-emerald-200 bg-white px-5 py-4 shadow-lift"
      >
        <div className="text-base font-bold text-emerald-700">+1 Progress</div>
        <div className="mt-1 text-sm font-semibold text-slate-600">+{result.xpAwarded} XP</div>
        {result.momentum >= 2 ? (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.2, 1] }}
            transition={{ duration: 0.35 }}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
          >
            <Flame size={12} />
            Momentum x{result.momentum}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

function QuestCard({
  task,
  isFocus,
  isPulsing,
  onFocus,
  onProgress,
  onStatus
}: {
  task: QuestTask;
  isFocus: boolean;
  isPulsing: boolean;
  onFocus: () => void;
  onProgress: () => void;
  onStatus: (status: QuestStatus) => void;
}) {
  return (
    <motion.article
      layout
      animate={
        isPulsing
          ? {
              scale: [1, 1.035, 1],
              borderColor: ["#dde3eb", "#22c55e", "#dde3eb"]
            }
          : { scale: 1 }
      }
      whileHover={{ y: -2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isFocus ? "border-slate-950 ring-2 ring-slate-950/10" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-semibold text-slate-950">{task.title}</h3>
            {isFocus ? (
              <span className="rounded-full bg-slate-950 px-2 py-1 text-xs font-semibold text-white">
                Focus
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${agentStyles[task.agent]}`}>
              {task.agent === "None" ? "No Agent" : task.agent}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              {task.status}
            </span>
          </div>
        </div>
        <motion.div
          key={task.progressCount}
          initial={{ scale: 0.88, opacity: 0.45 }}
          animate={{ scale: 1, opacity: 1 }}
          className="shrink-0 text-right"
        >
          <div className="text-3xl font-semibold text-slate-950">{task.progressCount}</div>
          <div className="text-xs font-medium text-slate-500">Progress</div>
        </motion.div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>最近更新 {relativeTime(task.updatedAt)}</span>
        {task.lastFocusedAt ? <span>专注 {relativeTime(task.lastFocusedAt)}</span> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {task.status !== "archived" ? (
          <>
            <IconButton onClick={onFocus} label="Focus" title="Focus this quest">
              <Target size={17} />
            </IconButton>
            <button
              type="button"
              onClick={onProgress}
              className="focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
              title="Progress +1"
            >
              <Zap size={17} />
              +1
            </button>
            <IconButton
              onClick={() => onStatus(task.status === "paused" ? "active" : "paused")}
              label={task.status === "paused" ? "Resume" : "Pause"}
              title={task.status === "paused" ? "Resume quest" : "Pause quest"}
            >
              {task.status === "paused" ? <Play size={17} /> : <Pause size={17} />}
            </IconButton>
            <IconButton onClick={() => onStatus("archived")} label="Archive" title="Archive quest">
              <Archive size={17} />
            </IconButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onStatus("active")}
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            title="Restore quest"
          >
            <RotateCcw size={17} />
            Restore
          </button>
        )}
      </div>
    </motion.article>
  );
}

function IconButton({
  onClick,
  title,
  label,
  children
}: {
  onClick: () => void;
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      title={title}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function ProgressLogPanel({ logs, task }: { logs: Array<{ id: string; note: string; at: string; xpAwarded: number; progressCount: number }>; task?: QuestTask }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Progress Log</h2>
          <p className="mt-1 text-sm text-slate-500">
            {task ? task.title : "No focus quest"}
          </p>
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
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  +{log.xpAwarded} XP
                </span>
              </div>
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
  const text =
    status === "active"
      ? "还没有 Active Quest"
      : status === "paused"
        ? "没有暂停中的 Quest"
        : "没有归档的 Quest";

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
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto flex w-fit items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.96 }}
      transition={{ duration: 0.18 }}
    >
      <Target size={17} />
      Focus Changed
    </motion.div>
  );
}

function MilestoneOverlay({ result }: { result: ProgressResult }) {
  const colors = ["#f59e0b", "#fb7185", "#a78bfa", "#22c55e", "#0ea5e9", "#14b8a6"];

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-slate-950/10 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
    >
      {/* Milestone fireworks */}
      {Array.from({ length: 30 }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / 30;
        const distance = 100 + (index % 5) * 30;
        const shapes = ["particle", "particle-star", "particle-diamond"] as const;

        return (
          <motion.span
            key={`firework-${index}`}
            className={shapes[index % shapes.length]}
            style={{ "--particle-color": colors[index % colors.length] } as CSSProperties}
            initial={{ left: "50%", top: "50%", opacity: 1, scale: 0.2, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: [0.2, 1.6, 0.5],
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              rotate: [0, 360]
            }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
        );
      })}

      <motion.div
        className="rounded-2xl border-2 border-amber-200 bg-white px-8 py-6 text-center shadow-lift"
        initial={{ scale: 0.5, y: 30, rotate: -5 }}
        animate={{ scale: [0.5, 1.15, 0.95, 1], y: 0, rotate: [-5, 2, 0] }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Trophy className="mx-auto text-amber-500" size={42} />
        </motion.div>
        <div className="mt-3 text-2xl font-bold text-slate-950">
          已推进 {result.milestone} 次
        </div>
        <div className="mt-2 text-base font-semibold text-amber-600">Milestone +50 XP</div>
      </motion.div>
    </motion.div>
  );
}
