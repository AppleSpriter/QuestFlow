"use client";

import { useEffect, useState } from "react";
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
import { useQuestStore } from "@/lib/quest-store";
import { ScrollReveal, type ScrollRevealInfo } from "@/components/ScrollReveal";

export function Spellbook({ onClose }: { onClose: () => void }) {
  const classStates = useQuestStore((s) => s.classStates);
  const useScrollAction = useQuestStore((s) => s.useScroll);
  const [scrollReveal, setScrollReveal] = useState<ScrollRevealInfo | null>(null);

  const handleUseScroll = (cn: ClassName) => {
    const result = useScrollAction(cn);
    if (!result) return;
    setScrollReveal({
      className: cn,
      lineId: result.lineId,
      isNew: result.isNew,
      upgraded: result.upgraded,
      fromTier: result.fromTier,
      toTier: result.toTier
    });
    setTimeout(() => setScrollReveal(null), 2800);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BookOpen size={22} className="text-violet-500" />
          法术书
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          你的职业成长与技能记录
        </p>

        <div className="mt-6 space-y-6">
          {ALL_CLASSES.map((cn) => {
            const meta = CLASS_META[cn];
            const cs = classStates[cn];
            const level = getClassLevel(cs.xp);
            const classLines = getClassLines(cn);
            const ownedMap = new Map(cs.skills.map((s) => [s.lineId, s]));

            return (
              <div key={cn} className={`rounded-xl border-2 p-4 ${meta.borderColor} ${meta.bgColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <h3 className={`text-lg font-bold ${meta.color}`}>{cn}（{meta.label}）</h3>
                      <p className="text-xs text-slate-500">Lv{level} · {cs.xp} XP</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cs.scrolls > 0 && (
                      <button
                        onClick={() => handleUseScroll(cn)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
                      >
                        <Scroll size={14} />
                        📜 {cs.scrolls} {meta.scrollName}
                      </button>
                    )}
                    {cs.scrolls === 0 && (
                      <span className="text-xs text-slate-400">无卷轴</span>
                    )}
                  </div>
                </div>

                {/* XP bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-400"
                    initial={false}
                    animate={{ width: `${(cs.xp % 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Skill Lines */}
                <div className="mt-3 space-y-2">
                  {classLines.map((line) => {
                    const owned = ownedMap.get(line.id);
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{line.emoji}</span>
                            <span className={`text-sm font-semibold ${isOwned ? "text-slate-900" : "text-slate-400"}`}>
                              {isOwned ? `${currentSkillName}` : "???"}
                            </span>
                            {isOwned && currentTier > 1 && (
                              <span className="text-xs text-slate-400">（{line.name}）</span>
                            )}
                          </div>
                          {isOwned && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              {getTierLabel(cn, currentTier)}
                            </span>
                          )}
                        </div>
                        {isOwned ? (
                          <div className="mt-1">
                            <div className="flex items-center gap-2">
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
                                ×{owned.copies}{currentTier < MAX_TIER ? ` / ${nextCopies}升${getTierLabel(cn, currentTier + 1)}` : " MAX"}
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
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
