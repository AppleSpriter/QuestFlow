"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Target, Tent, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { type ProgressResult, type LongRestSummary } from "@/lib/quest-store";
import { type ClassName, ALL_CLASSES, CLASS_META } from "@/data/classes";
import {
  FEAT_FLOW_META,
  FEAT_MAP,
  FEAT_QUALITY_META,
  type PendingFeatChoice,
} from "@/data/feats";
import type { ResonanceTrigger } from "@/data/resonance";

export function FocusChangedOverlay() {
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto flex w-fit items-center gap-2 rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.18 }}>
      <Target size={17} /> Focus Changed
    </motion.div>
  );
}

export function QuestCreatedOverlay({ title }: { title: string }) {
  return (
    <motion.div className="pointer-events-none fixed inset-x-0 top-32 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lift"
      initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} transition={{ duration: 0.18 }}>
      <CheckCircle2 size={17} />
      <span className="min-w-0 truncate">Quest Created · {title}</span>
    </motion.div>
  );
}

export function MilestoneOverlay({ result }: { result: ProgressResult }) {
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

export function NormalResonanceEffect({ resonance }: { resonance: ResonanceTrigger }) {
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

export function NewResonanceModal({ resonance, discoveredCount, onClose }: { resonance: ResonanceTrigger; discoveredCount: number; onClose: () => void }) {
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

export function FeatChoiceModal({ choice, onClose, onSelect }: { choice: PendingFeatChoice; onClose: (choiceId: string) => void; onSelect: (choiceId: string, featId: string) => void }) {
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

const classNames: ClassName[] = ALL_CLASSES;

export function LongRestSummaryModal({ summary, onClose }: { summary: LongRestSummary; onClose: () => void }) {
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
