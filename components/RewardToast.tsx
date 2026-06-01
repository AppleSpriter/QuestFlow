"use client";

import { motion, AnimatePresence } from "framer-motion";

export type RewardInfo = {
  xp: number;
  crystals: number;
  firstOfDay: boolean;
  milestone?: number;
  newRegion?: string;
  momentum: number;
};

export function RewardToast({ reward }: { reward: RewardInfo | null }) {
  return (
    <AnimatePresence>
      {reward ? (
        <motion.div
          className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
            <span className="text-sm font-bold text-emerald-600">+{reward.xp} XP</span>
            <span className="text-sm font-bold text-violet-600">+{reward.crystals} 💎</span>
            {reward.firstOfDay && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                每日首推!
              </span>
            )}
            {reward.momentum >= 3 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                🔥 x{reward.momentum}
              </span>
            )}
            {reward.milestone && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                🏆 Milestone {reward.milestone}!
              </span>
            )}
            {reward.newRegion && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                🗺️ 进入 {reward.newRegion}
              </span>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
