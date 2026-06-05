"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gem, Trophy } from "lucide-react";
import { ALL_CLASSES, CLASS_META, getClassLevel, type ClassName } from "@/data/classes";
import {
  FEAT_FLOW_META,
  FEAT_MAP,
  FEAT_QUALITY_META,
  getBuildSummaries,
  getNextFeatLevel,
  getOwnedFeatsForClass,
  getPrimaryFeatFlow,
  type PendingFeatChoice
} from "@/data/feats";
import { useQuestStore } from "@/lib/quest-store";

export default function BuildPage() {
  const classStates = useQuestStore((state) => state.classStates);
  const featState = useQuestStore((state) => state.featState);
  const discoveredResonances = useQuestStore((state) => state.discoveredResonances);
  const chooseFeat = useQuestStore((state) => state.chooseFeat);
  const [selectedClass, setSelectedClass] = useState<ClassName>("Wizard");

  useEffect(() => {
    const className = new URLSearchParams(window.location.search).get("class");
    if (className && ALL_CLASSES.includes(className as ClassName)) {
      setSelectedClass(className as ClassName);
    }
  }, []);

  const selectedState = classStates[selectedClass];
  const selectedMeta = CLASS_META[selectedClass];
  const selectedLevel = getClassLevel(selectedState.xp);
  const ownedFeats = getOwnedFeatsForClass(featState, selectedClass);
  const pendingChoices = featState.pending.filter((choice) => choice.className === selectedClass);
  const primaryFlow = getPrimaryFeatFlow(featState, selectedClass);
  const nextFeatLevel = getNextFeatLevel(selectedClass, classStates, featState);
  const buildSummaries = useMemo(
    () => getBuildSummaries({ classStates, featState, discoveredResonances }, selectedClass),
    [classStates, discoveredResonances, featState, selectedClass]
  );
  const topBuild = buildSummaries[0];

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-violet-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.97]">
              <ArrowLeft size={16} /> 返回冒险
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-black text-slate-950">
              <Trophy className="text-orange-500" /> Build Hall
            </h1>
            <p className="mt-2 text-sm text-slate-500">专长决定 Build。系统根据职业 XP、专长、共鸣与技能图鉴自动识别成长路线。</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-white/80 px-5 py-3 shadow-lift backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">当前评分</div>
            <div className="mt-1 text-2xl font-black text-slate-950">{topBuild?.rating ?? "萌芽型 Build"}</div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl border border-white/70 bg-white/85 p-3 shadow-lift backdrop-blur">
            <div className="px-2 pb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Classes</div>
            <div className="space-y-2">
              {ALL_CLASSES.map((className) => {
                const meta = CLASS_META[className];
                const level = getClassLevel(classStates[className].xp);
                const featCount = getOwnedFeatsForClass(featState, className).length;
                const pendingCount = featState.pending.filter((choice) => choice.className === className).length;
                const active = selectedClass === className;
                return (
                  <button
                    key={className}
                    type="button"
                    onClick={() => setSelectedClass(className)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition active:scale-[0.98] ${active ? "border-orange-300 bg-orange-50 shadow-sm" : "border-slate-100 bg-white hover:bg-slate-50"}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="truncate text-sm font-black text-slate-800">{className}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-slate-500">Lv{level} · 🧬{featCount}{pendingCount > 0 ? ` · 待选${pendingCount}` : ""}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-lift">
              <div className="bg-gradient-to-br from-white via-orange-50 to-violet-50 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.22em] text-orange-500">Selected Class</div>
                    <h2 className="mt-2 text-4xl font-black text-slate-950">{selectedMeta.emoji} {selectedClass}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{selectedMeta.label} · {selectedMeta.scrollName}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MetricBox label="当前等级" value={`Lv${selectedLevel}`} />
                    <MetricBox label="职业 XP" value={selectedState.xp.toString()} />
                    <MetricBox label="待选专长" value={pendingChoices.length.toString()} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3">
                <InfoCard title="主要流派" value={primaryFlow ? `${FEAT_FLOW_META[primaryFlow].emoji} ${FEAT_FLOW_META[primaryFlow].label}` : "尚未成型"} />
                <InfoCard title="职业倾向" value={`${selectedMeta.emoji} ${selectedClass} Lv${selectedLevel}`} />
                <InfoCard title="下个专长" value={nextFeatLevel ? `Lv${nextFeatLevel}` : pendingChoices.length > 0 ? "当前有可选专长" : "继续升级"} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lift">
                <h3 className="flex items-center gap-2 text-xl font-black text-slate-950"><Gem className="text-violet-500" /> 专长选择</h3>
                <div className="mt-4 space-y-4">
                  {pendingChoices.length > 0 ? pendingChoices.map((choice) => (
                    <PendingFeatChoicePanel key={choice.id} choice={choice} onSelect={chooseFeat} />
                  )) : null}

                  <div className="space-y-3">
                    <div className="text-sm font-black text-slate-500">已选专长</div>
                    {ownedFeats.length > 0 ? ownedFeats.map((owned) => {
                      const feat = FEAT_MAP[owned.id];
                      const flow = FEAT_FLOW_META[feat.flow];
                      const quality = FEAT_QUALITY_META[feat.quality];
                      return (
                        <div key={`${owned.className}-${owned.id}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-black text-slate-900">✓ {feat.emoji} {feat.name}</div>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-black" style={{ backgroundColor: `${quality.color}1A`, color: quality.color }}>{quality.emoji} {quality.label}</span>
                          </div>
                          <div className="mt-1 text-xs font-bold" style={{ color: flow.color }}>{flow.emoji} {flow.label} · Lv{owned.level}</div>
                          <p className="mt-2 text-sm text-slate-600">{feat.summary}</p>
                        </div>
                      );
                    }) : <EmptyState text="这个职业还没有选择专长。达到 Lv4 / Lv8 / Lv12... 后会出现待选专长。" />}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lift">
                <h3 className="flex items-center gap-2 text-xl font-black text-slate-950"><Trophy className="text-orange-500" /> Build 识别</h3>
                <div className="mt-4 space-y-3">
                  {buildSummaries.length > 0 ? buildSummaries.map((build) => (
                    <div key={build.id} className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-lg font-black text-slate-950">{build.emoji} {build.name}</div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-orange-600">{build.rating}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-orange-700">{build.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">条件：{build.effect}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {build.reasons.map((reason) => <span key={reason} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">{reason}</span>)}
                      </div>
                    </div>
                  )) : <EmptyState text="当前还没有满足的 Build 条件。多选择同一流派专长、积累共鸣或提升核心职业 XP 后会自动识别。" />}
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PendingFeatChoicePanel({ choice, onSelect }: { choice: PendingFeatChoice; onSelect: (choiceId: string, featId: string) => boolean }) {
  const [selectedFeatId, setSelectedFeatId] = useState<string | null>(null);
  const selectedFeat = selectedFeatId ? FEAT_MAP[selectedFeatId] : null;

  const confirmSelection = () => {
    if (selectedFeatId && onSelect(choice.id, selectedFeatId)) {
      setSelectedFeatId(null);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-amber-600">待选择专长 · Lv{choice.level}</div>
          <p className="mt-1 text-xs font-semibold text-slate-500">先选择卡片，再点击确认。确认后永久生效。</p>
        </div>
        <button type="button" disabled={!selectedFeatId} onClick={confirmSelection} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">
          确认选择
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {choice.choices.map((featId) => {
          const feat = FEAT_MAP[featId];
          const flow = FEAT_FLOW_META[feat.flow];
          const quality = FEAT_QUALITY_META[feat.quality];
          const selected = selectedFeatId === feat.id;
          return (
            <button
              key={feat.id}
              type="button"
              onClick={() => setSelectedFeatId(feat.id)}
              className={`rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 active:scale-[0.98] ${selected ? "border-amber-400 ring-4 ring-amber-100" : "border-slate-100"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black text-slate-950">{feat.emoji} {feat.name}</div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ backgroundColor: `${quality.color}1A`, color: quality.color }}>{quality.emoji}</span>
              </div>
              <div className="mt-1 text-[11px] font-black" style={{ color: flow.color }}>{flow.emoji} {flow.label}</div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{feat.summary}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs font-bold text-slate-500">
        {selectedFeat ? `准备选择：${selectedFeat.emoji} ${selectedFeat.name}` : "未选择前不会改变当前 Build。"}
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black text-slate-950">{value}</div>
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-2 text-lg font-black text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">{text}</div>;
}
