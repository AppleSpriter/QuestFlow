"use client";

import { motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { ALL_COMPANIONS, RARITY_CONFIG } from "@/data/companions";
import { useQuestStore } from "@/lib/quest-store";
import { CompanionCard, CompanionCardSilhouette } from "./CompanionCard";

export function CompanionCollection({ onClose }: { onClose: () => void }) {
  const companions = useQuestStore((s) => s.companions);
  const activeCompanionId = useQuestStore((s) => s.activeCompanionId);
  const setActive = useQuestStore((s) => s.setActiveCompanion);

  const owned = companions.filter((c) => c.owned).length;
  const total = ALL_COMPANIONS.length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <BookOpen size={22} className="text-amber-500" />
          伙伴图鉴
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          已收集 {owned} / {total}
        </p>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400"
            initial={false}
            animate={{ width: `${(owned / total) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ALL_COMPANIONS.map((companion, i) => {
            const state = companions.find((c) => c.id === companion.id);
            const isOwned = state?.owned ?? false;

            return isOwned ? (
              <div key={companion.id} className="relative" onClick={() => setActive(companion.id)}>
                <CompanionCard companion={companion} index={i} />
                {activeCompanionId === companion.id && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    陪伴中
                  </div>
                )}
                {state && state.copies > 1 && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    x{state.copies}
                  </div>
                )}
              </div>
            ) : (
              <CompanionCardSilhouette key={companion.id} rarity={companion.rarity} index={i} />
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
