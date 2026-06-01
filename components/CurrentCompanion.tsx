"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { ALL_COMPANIONS } from "@/data/companions";
import { useQuestStore } from "@/lib/quest-store";
import type { CompanionMood } from "@/data/companions";

export function CurrentCompanion({ mood }: { mood: CompanionMood }) {
  const activeCompanionId = useQuestStore((s) => s.activeCompanionId);
  const getLine = useQuestStore((s) => s.getCompanionLineForMood);
  const companions = useQuestStore((s) => s.companions);

  const companion = ALL_COMPANIONS.find((c) => c.id === activeCompanionId);
  const owned = companion ? companions.find((c) => c.id === companion.id) : undefined;

  const [line, setLine] = useState<string>("");
  const [lineKey, setLineKey] = useState(0);

  useEffect(() => {
    if (!companion || !owned?.owned) return;
    const newLine = getLine(mood);
    setLine(newLine);
    setLineKey((k) => k + 1);
  }, [mood, companion, owned, getLine]);

  if (!companion || !owned?.owned) return null;

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-40 flex items-end gap-3"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={lineKey}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="max-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <MessageCircle size={14} className="mt-0.5 shrink-0 text-violet-400" />
              <span>{line}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Companion avatar */}
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-violet-200 bg-violet-50 shadow-md"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-3xl">{companion.emoji}</span>
      </motion.div>
    </motion.div>
  );
}
