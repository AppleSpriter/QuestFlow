"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Target, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import {
  DEFAULT_PROGRESS_TAG_COLOR,
  PROGRESS_TAG_COLORS,
  type ProgressResult,
  type ProgressTag,
  type QuestTask,
} from "@/lib/quest-store";
import {
  type ClassName,
  CLASS_META,
  TAG_META,
} from "@/data/classes";
import { TaskMapProgress } from "@/components/TaskMapProgress";

const getTaskClass = (task: Pick<QuestTask, "className">): ClassName =>
  task.className && CLASS_META[task.className] ? task.className : "Wizard";

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
  Barbarian: "border-stone-200 bg-stone-50 text-stone-800",
};

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

export type FocusPanelProps = {
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
};

export function FocusPanel({
  task,
  note,
  setNote,
  progressTags,
  selectedProgressTagIds,
  onToggleProgressTag,
  onProgress,
  onCompleteRecurring,
  lastProgress,
  isPulsing,
}: FocusPanelProps) {
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
          当前专注 <span className="text-xs font-bold opacity-70">(Ctrl+A)</span>
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
