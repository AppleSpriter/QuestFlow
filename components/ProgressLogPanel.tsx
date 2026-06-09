"use client";

import { motion } from "framer-motion";
import { ChevronRight, Zap } from "lucide-react";
import {
  DEFAULT_PROGRESS_TAG_COLOR,
  PROGRESS_TAG_COLORS,
  type ProgressLog,
  type QuestTask,
} from "@/lib/quest-store";
import { CLASS_META } from "@/data/classes";

const formatLogTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(iso));

export function ProgressLogPanel({ logs, task, title = "Progress Log", subtitle }: { logs: ProgressLog[]; task?: QuestTask; title?: string; subtitle?: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle ?? (task ? task.title : "No focus quest")}</p>
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
