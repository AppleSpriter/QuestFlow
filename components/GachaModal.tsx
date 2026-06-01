"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import type { Companion } from "@/data/companions";
import { RARITY_CONFIG, GACHA_COST_SINGLE, GACHA_COST_TEN } from "@/data/companions";
import { CompanionCard } from "./CompanionCard";
import type { GachaResult } from "@/lib/quest-store";

type GachaPhase = "idle" | "rolling" | "result";

export function GachaModal({
  crystals,
  onGachaSingle,
  onGachaTen,
  onClose
}: {
  crystals: number;
  onGachaSingle: () => GachaResult | null;
  onGachaTen: () => GachaResult[] | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<GachaPhase>("idle");
  const [singleResult, setSingleResult] = useState<GachaResult | null>(null);
  const [tenResults, setTenResults] = useState<GachaResult[] | null>(null);
  const [isTen, setIsTen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const doGachaSingle = useCallback(() => {
    const result = onGachaSingle();
    if (!result) return;
    setIsTen(false);
    setPhase("rolling");
    setTimeout(() => {
      setSingleResult(result);
      setPhase("result");
      if (result.companion.rarity >= 5) setShowConfetti(true);
    }, 1200);
  }, [onGachaSingle]);

  const doGachaTen = useCallback(() => {
    const results = onGachaTen();
    if (!results) return;
    setIsTen(true);
    setPhase("rolling");
    setTimeout(() => {
      setTenResults(results);
      setPhase("result");
      if (results.some((r) => r.companion.rarity >= 5)) setShowConfetti(true);
    }, 1500);
  }, [onGachaTen]);

  const close = () => {
    setPhase("idle");
    setSingleResult(null);
    setTenResults(null);
    setShowConfetti(false);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Confetti for 5-star */}
      {showConfetti && <ConfettiOverlay />}

      <motion.div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Sparkles size={22} className="text-violet-500" />
          召唤伙伴
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          消耗水晶抽取工作伙伴
        </p>
        <div className="mt-2 text-sm font-semibold text-violet-600">
          💎 {crystals} Crystal
        </div>

        {phase === "idle" && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={doGachaSingle}
              disabled={crystals < GACHA_COST_SINGLE}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-violet-600 hover:to-purple-700 disabled:opacity-40"
            >
              <Sparkles size={18} />
              单抽 (💎 {GACHA_COST_SINGLE})
            </button>
            <button
              onClick={doGachaTen}
              disabled={crystals < GACHA_COST_TEN}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-40"
            >
              <Sparkles size={18} />
              十连召唤 (💎 {GACHA_COST_TEN})
            </button>
          </div>
        )}

        {phase === "rolling" && (
          <div className="mt-8 flex flex-col items-center gap-4 py-12">
            <motion.div
              className="text-6xl"
              animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              ✨
            </motion.div>
            <motion.p
              className="text-lg font-bold text-violet-600"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              召唤中...
            </motion.p>
          </div>
        )}

        {phase === "result" && !isTen && singleResult && (
          <div className="mt-6">
            <GachaReveal companion={singleResult.companion} isNew={singleResult.isNew} />
          </div>
        )}

        {phase === "result" && isTen && tenResults && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {tenResults.map((r, i) => (
              <div key={`${r.companion.id}-${i}`} className="relative">
                <CompanionCard companion={r.companion} isNew={r.isNew} index={i} />
              </div>
            ))}
          </div>
        )}

        {phase === "result" && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setPhase("idle");
                setSingleResult(null);
                setTenResults(null);
                setShowConfetti(false);
              }}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              继续召唤
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function GachaReveal({ companion, isNew }: { companion: Companion; isNew: boolean }) {
  const config = RARITY_CONFIG[companion.rarity];

  return (
    <motion.div
      className="flex flex-col items-center gap-3 py-4"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {/* Rarity glow */}
      {companion.rarity >= 4 && (
        <motion.div
          className="absolute h-40 w-40 rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.glowColor}60 0%, transparent 70%)`
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <motion.span
        className="relative text-7xl"
        animate={
          companion.rarity === 5
            ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
            : companion.rarity === 4
              ? { scale: [1, 1.1, 1] }
              : {}
        }
        transition={{ duration: 0.6 }}
      >
        {companion.emoji}
      </motion.span>

      <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
      <div className="text-xl font-bold text-slate-900">{companion.name}</div>
      <p className="max-w-xs text-center text-sm text-slate-500">{companion.description}</p>
      {isNew && (
        <motion.span
          className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.4, repeat: 3 }}
        >
          ✨ 新伙伴！
        </motion.span>
      )}
    </motion.div>
  );
}

function ConfettiOverlay() {
  const [ConfettiComponent, setConfettiComponent] = useState<React.ComponentType<{
    width: number;
    height: number;
    recycle: boolean;
    numberOfPieces: number;
  }> | null>(null);

  useState(() => {
    import("react-confetti").then((mod) => {
      setConfettiComponent(() => mod.default);
    });
  });

  if (!ConfettiComponent) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <ConfettiComponent
        width={typeof window !== "undefined" ? window.innerWidth : 800}
        height={typeof window !== "undefined" ? window.innerHeight : 600}
        recycle={false}
        numberOfPieces={200}
      />
    </div>
  );
}
