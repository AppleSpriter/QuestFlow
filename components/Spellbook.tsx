"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Scroll, X } from "lucide-react";
import {
  type ClassName,
  ALL_CLASSES,
  CLASS_META,
  MAX_TIER,
  getClassLevel,
  getClassLines,
  getLineById,
  getSkillNameAtTier,
  getTierLabel,
  getTierFromCopies,
  getNextTierCopies,
  getCopiesForTier
} from "@/data/classes";
import dynamic from "next/dynamic";
import { useQuestStore } from "@/lib/quest-store";
import type { ScrollRevealInfo } from "@/components/ScrollReveal";

const ScrollReveal = dynamic(() => import("@/components/ScrollReveal").then((mod) => mod.ScrollReveal), { ssr: false });

export function Spellbook({ onClose }: { onClose: () => void }) {
  const classStates = useQuestStore((s) => s.classStates);
  const spendScroll = useQuestStore((s) => s.useScroll);
  const [selectedClass, setSelectedClass] = useState<ClassName>(ALL_CLASSES[0]);
  const [scrollReveal, setScrollReveal] = useState<ScrollRevealInfo | null>(null);
  const scrollRevealQueueRef = useRef<ScrollRevealInfo[]>([]);
  const scrollRevealPlayingRef = useRef(false);

  const playNextScrollReveal = useCallback(() => {
    if (scrollRevealPlayingRef.current) return;
    const next = scrollRevealQueueRef.current.shift();
    if (!next) return;

    scrollRevealPlayingRef.current = true;
    setScrollReveal(next);
    setTimeout(() => {
      setScrollReveal(null);
      scrollRevealPlayingRef.current = false;
      setTimeout(playNextScrollReveal, 180);
    }, 2800);
  }, []);

  const enqueueScrollReveal = useCallback((info: ScrollRevealInfo) => {
    const q = scrollRevealQueueRef.current;
    if (q.length >= 3) return;
    q.push(info);
    playNextScrollReveal();
  }, [playNextScrollReveal]);

  const handleUseScroll = (cn: ClassName) => {
    const result = spendScroll(cn);
    if (!result) return;
    enqueueScrollReveal({
      className: cn,
      lineId: result.lineId,
      isNew: result.isNew,
      upgraded: result.upgraded,
      fromTier: result.fromTier,
      toTier: result.toTier
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const getStateForClass = (cn: ClassName) =>
    classStates[cn] ?? { xp: 0, scrolls: 0, skills: [], fatigue: 0 };

  const selectedMeta = CLASS_META[selectedClass];
  const selectedState = getStateForClass(selectedClass);
  const selectedLevel = getClassLevel(selectedState.xp);
  const selectedLines = getClassLines(selectedClass);
  const selectedOwnedMap = new Map(selectedState.skills.map((s) => [s.lineId, s]));
  const learnedCount = selectedState.skills.length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <ScrollReveal info={scrollReveal} />
      <motion.div
        className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="关闭法术书"
        >
          <X size={20} />
        </button>

        <div className="border-b border-slate-200 px-5 py-4 pr-12">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <BookOpen size={22} className="text-violet-500" />
            法术书
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            你的职业成长与技能记录
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="border-b border-slate-200 bg-slate-50/80 md:w-[320px] md:shrink-0 md:border-b-0 md:border-r">
            <div className="max-h-[34vh] overflow-y-auto p-3 md:h-full md:max-h-none">
              <div className="grid grid-cols-2 gap-2">
                {ALL_CLASSES.map((cn) => {
                  const meta = CLASS_META[cn];
                  const cs = getStateForClass(cn);
                  const level = getClassLevel(cs.xp);
                  const isSelected = cn === selectedClass;

                  return (
                    <button
                      key={cn}
                      type="button"
                      onClick={() => setSelectedClass(cn)}
                      aria-pressed={isSelected}
                      className={`focus-ring min-h-[72px] rounded-xl border px-3 py-2 text-left transition ${
                        isSelected
                          ? `${meta.borderColor} ${meta.bgColor} shadow-sm`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className={`truncate text-sm font-bold ${isSelected ? meta.color : "text-slate-800"}`}>
                            {cn}
                          </div>
                          <div className="truncate text-[11px] text-slate-500">{meta.label}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>Lv{level}</span>
                        <span>{cs.skills.length}/5</span>
                        <span className={cs.scrolls > 0 ? "font-bold text-amber-700" : ""}>
                          📜 {cs.scrolls}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className={`rounded-xl border-2 p-4 ${selectedMeta.borderColor} ${selectedMeta.bgColor}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedMeta.emoji}</span>
                  <div>
                    <h3 className={`text-lg font-bold ${selectedMeta.color}`}>
                      {selectedClass}（{selectedMeta.label}）
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lv{selectedLevel} · {selectedState.xp} XP · {learnedCount}/5 技能线
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedState.scrolls > 0 && (
                    <button
                      onClick={() => handleUseScroll(selectedClass)}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
                    >
                      <Scroll size={14} />
                      📜 {selectedState.scrolls} {selectedMeta.scrollName}
                    </button>
                  )}
                  {selectedState.scrolls === 0 && (
                    <span className="rounded-lg border border-white/70 bg-white/60 px-3 py-1.5 text-xs text-slate-400">
                      无卷轴
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/60">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-400"
                  initial={false}
                  animate={{ width: `${selectedState.xp % 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {selectedLines.map((line) => {
                const owned = selectedOwnedMap.get(line.id);
                const isOwned = !!owned;
                const currentTier = owned ? getTierFromCopies(owned.copies) : 0;
                const nextCopies = currentTier < MAX_TIER ? getNextTierCopies(currentTier) : getCopiesForTier(MAX_TIER);
                const currentSkillName = isOwned ? getSkillNameAtTier(line, currentTier) : "";

                return (
                  <div
                    key={line.id}
                    className={`rounded-lg border p-3 transition ${
                      isOwned
                        ? "border-slate-200 bg-white shadow-sm"
                        : "border-dashed border-slate-300 bg-slate-100 opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="text-lg">{line.emoji}</span>
                        <span className={`truncate text-sm font-semibold ${isOwned ? "text-slate-900" : "text-slate-400"}`}>
                          {isOwned ? currentSkillName : "???"}
                        </span>
                        {isOwned && currentTier > 1 && (
                          <span className="truncate text-xs text-slate-400">（{line.name}）</span>
                        )}
                      </div>
                      {isOwned && (
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          {getTierLabel(selectedClass, currentTier)}
                        </span>
                      )}
                    </div>
                    {isOwned ? (
                      <div className="mt-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: MAX_TIER }).map((_, t) => (
                              <div
                                key={t}
                                className={`h-1.5 w-2 rounded-full ${
                                  t + 1 <= currentTier ? "bg-violet-400" : "bg-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ×{owned.copies}{currentTier < MAX_TIER ? ` / ${nextCopies}升${getTierLabel(selectedClass, currentTier + 1)}` : " MAX"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400 italic">
                        {line.name} · 未习得
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
