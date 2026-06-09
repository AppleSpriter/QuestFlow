"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { SkillCheckResult, ClassName } from "@/data/classes";
import { CLASS_META, getTierLabel } from "@/data/classes";

export type SkillCheckInfo = {
  check: SkillCheckResult;
  scrollEarned?: string;
  scrollCount?: number;
  newSkill?: string;
  skillUpgrade?: { name: string; fromTier: number; toTier: number; className: ClassName };
  synergyBonus?: boolean;
  resonanceName?: string;
  resonanceReward?: string;
};

export function SkillCheckToast({ info }: { info: SkillCheckInfo | null }) {
  const [mounted, setMounted] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [displayRoll, setDisplayRoll] = useState(1);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!info) return;
    setRolling(true);
    setDisplayRoll(Math.floor(Math.random() * 20) + 1);

    const interval = setInterval(() => {
      setDisplayRoll(Math.floor(Math.random() * 20) + 1);
    }, 70);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setRolling(false);
    }, 900);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [info]);

  const content = (
    <AnimatePresence>
      {info ? (
        <motion.div
          className="pointer-events-none fixed left-1/2 top-16 z-50"
          initial={{ opacity: 0, x: "-50%", y: -20, scale: 0.9 }}
          animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
          exit={{ opacity: 0, x: "-50%", y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`rounded-xl border px-5 py-3 shadow-lg transition-colors duration-300 ${
            !rolling && info.check.critical
              ? "border-amber-400 bg-gradient-to-br from-amber-50 to-white shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              : !rolling && !info.check.success
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-white"
          }`}>
            {/* Dice roll */}
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                animate={rolling ? { rotate: [0, 360, 720, 1080], scale: [1, 1.2, 0.9, 1] } : { rotate: 0, scale: 1 }}
                transition={rolling ? { duration: 0.9, ease: "easeInOut" } : { duration: 0.3 }}
              >
                🎲
              </motion.span>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {rolling ? "骰子检定中..." : `${info.check.skillName} 检定`}
                </div>
                <div className="text-xs text-slate-500">
                  {rolling ? (
                    <motion.span
                      key={displayRoll}
                      initial={{ opacity: 0, scale: 1.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.06 }}
                    >
                      D20 · {displayRoll}
                    </motion.span>
                  ) : (
                    <span>
                      Lv{info.check.classLevel} · DC {info.check.dc} · 投骰 {info.check.roll}+{info.check.modifier} = {info.check.roll + info.check.modifier}
                    </span>
                  )}
                </div>
                {!rolling && info.check.advantageTriggered && (
                  <div className="mt-0.5 text-[11px] font-semibold text-sky-600">
                    等级优势：{info.check.naturalRolls.join(" / ")} 取高
                  </div>
                )}
              </div>
              {!rolling && (
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${
                  info.check.critical
                    ? "bg-amber-100 text-amber-800"
                    : info.check.success
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                }`}>
                  {info.check.critical ? "大成功！" : info.check.success ? "成功" : "失败"}
                </div>
              )}
            </div>

            {/* Rewards */}
            {!rolling && info.check.success && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-violet-600">
                  +{info.check.xpBonus} {CLASS_META[info.check.className].emoji} XP
                </span>
              </div>
            )}

            {/* Scroll earned */}
            {!rolling && info.scrollEarned && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.15, 1], opacity: 1 }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"
              >
                📜 {info.scrollEarned}
                {info.scrollCount && info.scrollCount > 1 ? ` x${info.scrollCount}（大成功双倍）` : " x1"}
              </motion.div>
            )}

            {/* Synergy bonus */}
            {!rolling && info.synergyBonus && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800"
              >
                ✨ {info.resonanceName ? `职业共鸣：${info.resonanceName} · ${info.resonanceReward}` : "职业共鸣"}
              </motion.div>
            )}

            {/* New skill learned */}
            {!rolling && info.newSkill && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800"
              >
                ✨ 习得: {info.newSkill}
              </motion.div>
            )}

            {/* Skill upgraded */}
            {!rolling && info.skillUpgrade && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800"
              >
                ⬆️ {info.skillUpgrade.name} → {getTierLabel(info.skillUpgrade.className, info.skillUpgrade.toTier)}
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
