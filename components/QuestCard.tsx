"use client";

import { motion } from "framer-motion";
import {
  Archive,
  CheckCircle2,
  Circle,
  Pause,
  Play,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { type QuestStatus, type QuestTask } from "@/lib/quest-store";
import {
  type ClassName,
  type TaskTag,
  CLASS_META,
  TAG_META,
  getMapRegion,
} from "@/data/classes";

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

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));

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

export type QuestCardProps = {
  task: QuestTask;
  isFocus: boolean;
  isPulsing: boolean;
  onFocus: () => void;
  onProgress: () => void;
  onStatus: (status: QuestStatus) => void;
  onTagsChange: (tags: TaskTag[]) => void;
};

export function QuestCard({
  task,
  isFocus,
  isPulsing,
  onFocus,
  onProgress,
  onStatus,
  onTagsChange,
}: QuestCardProps) {
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
