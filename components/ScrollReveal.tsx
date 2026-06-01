"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CSSProperties } from "react";
import {
  type ClassName,
  CLASS_META,
  getLineById,
  getSkillNameAtTier,
  getTierLabel
} from "@/data/classes";

export type ScrollRevealInfo = {
  className: ClassName;
  lineId: string;
  isNew: boolean;
  upgraded: boolean;
  fromTier: number;
  toTier: number;
};

export function ScrollReveal({ info }: { info: ScrollRevealInfo | null }) {
  return (
    <AnimatePresence>
      {info ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Sparkle particles */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (Math.PI * 2 * i) / 16;
            const distance = 80 + (i % 4) * 25;
            const colors = ["#f59e0b", "#a78bfa", "#22c55e", "#0ea5e9", "#fb7185"];
            return (
              <motion.span
                key={`spark-${i}`}
                className="particle-star"
                style={{ "--particle-color": colors[i % colors.length] } as CSSProperties}
                initial={{ left: "50%", top: "50%", opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.2, 0.8, 0],
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  rotate: [0, 180 + i * 20]
                }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 + (i % 3) * 0.06 }}
              />
            );
          })}

          {/* Rising glow particles for upgrade */}
          {info.upgraded && Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`rise-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${45 + Math.random() * 10}%`,
                background: "linear-gradient(to top, #a78bfa, #f59e0b)",
                width: 6 + i * 2,
                height: 6 + i * 2,
              }}
              initial={{ top: "55%", opacity: 0.8 }}
              animate={{ top: ["55%", "30%", "5%"], opacity: [0.8, 0.6, 0], scale: [0.5, 1, 0.3] }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 + i * 0.1 }}
            />
          ))}

          {/* Main card */}
          <motion.div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-2xl"
            initial={{ scale: 0.4, y: 60, rotate: -5 }}
            animate={{
              scale: [0.4, 1.08, 0.97, 1],
              y: [60, 0, -4, 0],
              rotate: [-5, 1, 0]
            }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Decorative top bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

            {/* Scroll icon + title */}
            <div className="px-6 pt-5 pb-4 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.3, 1], rotate: [-180, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mb-3 text-5xl"
              >
                📜
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm font-bold text-amber-800"
              >
                {CLASS_META[info.className].scrollName}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-1 text-xs text-amber-600/70"
              >
                {CLASS_META[info.className].emoji} {info.className}（{CLASS_META[info.className].label}）
              </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-amber-200" />

            {/* Skill reveal */}
            {(() => {
              const line = getLineById(info.lineId);
              if (!line) return null;
              const skillName = getSkillNameAtTier(line, info.toTier);
              const tierLabel = getTierLabel(info.className, info.toTier);

              return (
                <div className="px-6 py-5 text-center">
                  {/* Line name */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs font-medium text-slate-400"
                  >
                    {line.emoji} {line.name}
                  </motion.div>

                  {/* Skill name - big reveal */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1] }}
                    transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
                    className="mt-2 text-2xl font-bold text-slate-900"
                  >
                    {skillName}
                  </motion.div>

                  {/* Tier badge */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.15, 1], opacity: [0, 1, 1] }}
                    transition={{ duration: 0.4, delay: 0.65 }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-bold text-violet-700"
                  >
                    {tierLabel}
                  </motion.div>

                  {/* New / Upgrade status */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mt-3"
                  >
                    {info.isNew ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        ✨ 习得新技能
                      </span>
                    ) : info.upgraded ? (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          {getTierLabel(info.className, info.fromTier)}
                        </span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.3, 1] }}
                          transition={{ delay: 0.85 }}
                          className="text-amber-500"
                        >
                          →
                        </motion.span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {getTierLabel(info.className, info.toTier)}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        +1 副本（{line.name}）
                      </span>
                    )}
                  </motion.div>
                </div>
              );
            })()}

            {/* Bottom decorative bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
