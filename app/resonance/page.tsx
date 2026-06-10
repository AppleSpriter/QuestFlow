"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import { ALL_CLASSES, CLASS_META, type ClassName } from "@/data/classes";
import { RESONANCE_DEFINITIONS, RESONANCE_MAP, getResonanceKey, getResonanceLevel, type ResonanceDefinition } from "@/data/resonance";
import { useQuestStore } from "@/lib/quest-store";

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(iso));

export default function ResonanceTemplePage() {
  const discoveredResonances = useQuestStore((state) => state.discoveredResonances);
  const [selected, setSelected] = useState<ResonanceDefinition | null>(null);
  const discoveredCount = Object.keys(discoveredResonances).length;
  const totalCount = RESONANCE_DEFINITIONS.length;

  const discoveredKeys = useMemo(() => new Set(Object.keys(discoveredResonances)), [discoveredResonances]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 px-4 py-6 text-slate-900 dark:from-slate-950 dark:via-violet-950 dark:to-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> 返回冒险
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-950 dark:text-slate-100">
              <Sparkles className="text-violet-600" /> 共鸣圣殿
            </h1>
            <p className="mt-2 text-sm text-slate-500">连续推进两个不同职业的任务，解锁双职业共鸣图鉴。</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-white/80 px-5 py-3 shadow-lift backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">已发现</div>
            <div className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100">{discoveredCount} / {totalCount}</div>
          </div>
        </header>

        <section className="overflow-x-auto rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lift backdrop-blur">
          <div className="grid min-w-[1120px] gap-2" style={{ gridTemplateColumns: `88px repeat(${ALL_CLASSES.length}, minmax(82px, 1fr))` }}>
            <div />
            {ALL_CLASSES.map((cn) => (
              <HeaderCell key={cn} className={cn} />
            ))}
            {ALL_CLASSES.map((rowClass, rowIndex) => (
              <RowCells
                key={rowClass}
                rowClass={rowClass}
                rowIndex={rowIndex}
                discoveredKeys={discoveredKeys}
                discoveredResonances={discoveredResonances}
                onSelect={setSelected}
              />
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selected ? (
          <ResonanceDetail definition={selected} discovered={discoveredResonances[selected.key]} onClose={() => setSelected(null)} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function HeaderCell({ className }: { className: ClassName }) {
  const meta = CLASS_META[className];
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3 text-center dark:border-slate-700 dark:bg-slate-900/90">
      <div className="text-2xl">{meta.emoji}</div>
      <div className="mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-200">{className}</div>
    </div>
  );
}

function RowCells({
  rowClass,
  rowIndex,
  discoveredKeys,
  discoveredResonances,
  onSelect
}: {
  rowClass: ClassName;
  rowIndex: number;
  discoveredKeys: Set<string>;
  discoveredResonances: Record<string, { triggerCount: number }>;
  onSelect: (definition: ResonanceDefinition) => void;
}) {
  const rowMeta = CLASS_META[rowClass];
  return (
    <>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90">
        <span className="text-xl">{rowMeta.emoji}</span>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-200">{rowClass}</span>
      </div>
      {ALL_CLASSES.map((colClass, colIndex) => {
        if (rowIndex === colIndex) return <DisabledCell key={colClass} />;
        if (colIndex < rowIndex) return <EmptyCell key={colClass} />;

        const key = getResonanceKey(rowClass, colClass);
        const definition = RESONANCE_MAP[key];
        const unlocked = discoveredKeys.has(key);
        return unlocked
          ? <UnlockedCell key={colClass} definition={definition} triggerCount={discoveredResonances[key]?.triggerCount ?? 1} onSelect={onSelect} />
          : <LockedCell key={colClass} definition={definition} />;
      })}
    </>
  );
}

function DisabledCell() {
  return <div className="flex min-h-20 items-center justify-center rounded-2xl border border-slate-100 bg-slate-100 text-xl font-bold text-slate-300 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-600">—</div>;
}

function EmptyCell() {
  return <div className="min-h-20" />;
}

function LockedCell({ definition }: { definition: ResonanceDefinition }) {
  return (
    <button
      type="button"
      title="尚未发现：连续推进这两个不同职业的任务即可解锁。"
      className="group flex min-h-20 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-100/80 px-2 py-3 text-center opacity-60 transition hover:opacity-90 dark:border-slate-800 dark:bg-slate-950/80"
    >
      <span className="text-xl font-black text-slate-400 dark:text-slate-500">?</span>
      <span className="mt-1 text-[10px] font-semibold text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-300">尚未发现</span>
      <span className="sr-only">{definition.classes.join(" + ")}</span>
    </button>
  );
}

function UnlockedCell({ definition, triggerCount, onSelect }: { definition: ResonanceDefinition; triggerCount: number; onSelect: (definition: ResonanceDefinition) => void }) {
  const level = getResonanceLevel(triggerCount);
  const borderClass = level >= 5
    ? "border-amber-300 shadow-[0_0_28px_rgba(245,158,11,0.28)]"
    : level >= 4
      ? "border-fuchsia-300 shadow-[0_0_24px_rgba(217,70,239,0.24)]"
      : level >= 3
        ? "border-violet-300 shadow-[0_0_22px_rgba(124,58,237,0.22)]"
        : "border-violet-200 shadow-[0_0_18px_rgba(124,58,237,0.12)]";
  return (
    <button
      type="button"
      title={`${definition.classes.join(" + ")} · 奖励：${definition.reward.shortLabel}`}
      onClick={() => onSelect(definition)}
      className={`relative flex min-h-20 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-violet-50 px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_0_24px_rgba(124,58,237,0.2)] active:scale-[0.97] dark:from-slate-900 dark:to-violet-950/80 dark:hover:border-violet-400 ${borderClass}`}
    >
      <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent dark:via-violet-500" />
      <span className="text-2xl leading-none">{definition.badge}</span>
      <span className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{definition.name}</span>
      <span className="mt-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">Lv.{level}</span>
    </button>
  );
}

function ResonanceDetail({ definition, discovered, onClose }: { definition: ResonanceDefinition; discovered?: { discoveredAt: string; triggerCount: number }; onClose: () => void }) {
  const [a, b] = definition.classes;
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-lg rounded-3xl border border-white/80 bg-white p-6 shadow-2xl" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-violet-500">共鸣名称</div>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100">{definition.reward.emoji} {definition.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <DetailRow label="职业组合" value={`${CLASS_META[a].emoji} ${a} + ${CLASS_META[b].emoji} ${b}`} />
          <DetailRow label="解锁时间" value={discovered ? formatDateTime(discovered.discoveredAt) : "尚未记录"} />
          <DetailRow label="共鸣等级" value={`Lv.${getResonanceLevel(discovered?.triggerCount ?? 0)}`} />
          <DetailRow label="触发次数" value={`${discovered?.triggerCount ?? 0} 次`} />
          <DetailRow label="奖励效果" value={`${definition.reward.emoji} ${definition.reward.detail}`} />
        </div>

        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-sm leading-6 text-slate-700">
          {definition.description}
        </div>

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98]">
          关闭
        </button>
      </motion.div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-900">{value}</span>
    </div>
  );
}
