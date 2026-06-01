"use client";

import { motion } from "framer-motion";
import { type Companion, RARITY_CONFIG, type CompanionRarity } from "@/data/companions";

export function CompanionCard({
  companion,
  isNew,
  index = 0,
  onClick
}: {
  companion: Companion;
  isNew?: boolean;
  index?: number;
  onClick?: () => void;
}) {
  const config = RARITY_CONFIG[companion.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 p-4 text-center shadow-sm transition-shadow hover:shadow-md ${
        companion.rarity === 5
          ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white"
          : companion.rarity === 4
            ? "border-violet-300 bg-gradient-to-b from-violet-50 to-white"
            : "border-slate-200 bg-white"
      }`}
    >
      {companion.rarity >= 4 && (
        <motion.div
          className="absolute inset-0 rounded-xl opacity-20"
          style={{
            background: `radial-gradient(circle, ${config.glowColor}40 0%, transparent 70%)`
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="relative">
        <span className="text-4xl">{companion.emoji}</span>
        {isNew && (
          <motion.span
            className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
          >
            NEW
          </motion.span>
        )}
      </div>
      <div className={`mt-2 text-xs font-bold ${config.color}`}>{config.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{companion.name}</div>
      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{companion.description}</p>
    </motion.div>
  );
}

export function CompanionCardSilhouette({
  rarity,
  index = 0
}: {
  rarity: CompanionRarity;
  index?: number;
}) {
  const config = RARITY_CONFIG[rarity];

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center opacity-60">
      <span className="text-4xl">❓</span>
      <div className={`mt-2 text-xs font-bold ${config.color}`}>{config.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-400">???</div>
    </div>
  );
}
