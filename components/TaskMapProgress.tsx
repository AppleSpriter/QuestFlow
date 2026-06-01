"use client";

import { getMapRegion, MAP_REGIONS } from "@/data/classes";

export function TaskMapProgress({ progressCount }: { progressCount: number }) {
  const current = getMapRegion(progressCount);
  const regionIndex = MAP_REGIONS.findIndex((r) => r.id === current.id);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">
        {current.emoji} {current.name}
      </span>
      <div className="flex gap-0.5">
        {MAP_REGIONS.map((region, i) => (
          <div
            key={region.id}
            className={`h-2 rounded-full transition-all ${
              i < regionIndex
                ? "w-6 bg-emerald-400"
                : i === regionIndex
                  ? "w-8 bg-emerald-500 ring-1 ring-emerald-300"
                  : "w-4 bg-slate-200"
            }`}
            title={`${region.emoji} ${region.name}`}
          />
        ))}
      </div>
    </div>
  );
}
