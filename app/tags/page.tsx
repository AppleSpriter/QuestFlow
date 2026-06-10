"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import {
  DEFAULT_PROGRESS_TAG_COLOR,
  PROGRESS_TAG_COLORS,
  type ProgressTag,
  type ProgressTagColorId,
  useQuestStore
} from "@/lib/quest-store";

const colorIds = Object.keys(PROGRESS_TAG_COLORS) as ProgressTagColorId[];

export default function TagsPage() {
  const progressTags = useQuestStore((state) => state.progressTags);
  const addProgressTag = useQuestStore((state) => state.addProgressTag);
  const updateProgressTag = useQuestStore((state) => state.updateProgressTag);
  const deleteProgressTag = useQuestStore((state) => state.deleteProgressTag);
  const logs = useQuestStore((state) => state.logs);
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState<ProgressTagColorId>(DEFAULT_PROGRESS_TAG_COLOR);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const usageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((log) => {
      log.progressTags?.forEach((tag) => counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1));
    });
    return counts;
  }, [logs]);

  const sortedTags = useMemo(
    () => [...progressTags].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [progressTags]
  );

  const editingTag = editingTagId ? progressTags.find((tag) => tag.id === editingTagId) : undefined;

  const resetForm = () => {
    setName("");
    setColorId(DEFAULT_PROGRESS_TAG_COLOR);
    setEditingTagId(null);
  };

  const submitTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tagName = name.trim();
    if (!tagName) return;
    if (editingTag) {
      if (updateProgressTag(editingTag.id, { name: tagName, colorId })) {
        setMessage(`已更新标签：${tagName}`);
        resetForm();
      }
      return;
    }
    if (addProgressTag(tagName, colorId)) {
      setMessage(`已创建标签：${tagName}`);
      resetForm();
    }
  };

  const startEditing = (tag: ProgressTag) => {
    setEditingTagId(tag.id);
    setName(tag.name);
    setColorId(tag.colorId);
  };

  const removeTag = (tag: ProgressTag) => {
    deleteProgressTag(tag.id);
    if (editingTagId === tag.id) resetForm();
    setMessage(`已删除标签：${tag.name}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 py-6 text-slate-900 dark:from-slate-950 dark:via-emerald-950 dark:to-slate-900 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft size={16} /> 返回冒险
            </Link>
            <h1 className="flex items-center gap-2 text-3xl font-black text-slate-950 dark:text-slate-100">
              <Tags className="text-emerald-500" /> Progress Tags
            </h1>
            <p className="mt-2 text-sm text-slate-500">配置常用推进标签，例如“群追踪”“复盘”“客户跟进”，推进任务时一键选择并写入日志。</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white/80 px-5 py-3 shadow-lift backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">Reusable Tags</div>
            <div className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-100">{progressTags.length}</div>
          </div>
        </header>

        {message ? (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            <CheckCircle2 size={17} /> {message}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lift">
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-100">{editingTag ? "编辑标签" : "新建标签"}</h2>
            <form onSubmit={submitTag} className="mt-4 space-y-4">
              <div>
                <label htmlFor="tag-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tag Name</label>
                <input
                  id="tag-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：群追踪"
                  className="focus-ring mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Preset Colors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorIds.map((id) => {
                    const color = PROGRESS_TAG_COLORS[id];
                    const active = colorId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setColorId(id)}
                        className="rounded-full border px-3 py-1.5 text-xs font-black transition hover:-translate-y-0.5 active:scale-[0.96]"
                        style={{
                          color: color.textColor,
                          backgroundColor: active ? color.bgColor : "#ffffff",
                          borderColor: active ? color.borderColor : `${color.borderColor}99`
                        }}
                      >
                        {color.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-black text-slate-400">Preview</div>
                <TagPill tag={{ id: "preview", name: name.trim() || "群追踪", colorId, createdAt: "", updatedAt: "" }} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={!name.trim()} className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300">
                  {editingTag ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingTag ? "保存修改" : "创建标签"}
                </button>
                {editingTag ? (
                  <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 active:scale-[0.98]">取消编辑</button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lift">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950 dark:text-slate-100">标签列表</h2>
                <p className="mt-1 text-sm text-slate-500">删除标签不会影响历史日志，历史记录保留当时的标签快照。</p>
              </div>
            </div>
            {sortedTags.length > 0 ? (
              <div className="space-y-3">
                {sortedTags.map((tag) => (
                  <article key={tag.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <TagPill tag={tag} />
                      <div className="mt-2 text-xs font-semibold text-slate-500">已用于 {usageCounts.get(tag.id) ?? 0} 条 Progress Log</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => startEditing(tag)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]">
                        <Pencil size={14} /> 编辑
                      </button>
                      <button type="button" onClick={() => removeTag(tag)} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]">
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <div>
                  <Tags className="mx-auto text-slate-400" size={32} />
                  <p className="mt-3 text-sm font-bold text-slate-600">还没有 Progress 标签</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">先创建一个常用标签，再回到首页推进任务时选择。</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TagPill({ tag }: { tag: ProgressTag }) {
  const color = PROGRESS_TAG_COLORS[tag.colorId] ?? PROGRESS_TAG_COLORS[DEFAULT_PROGRESS_TAG_COLOR];
  return (
    <span
      className="mt-2 inline-flex max-w-full rounded-full border px-3 py-1.5 text-sm font-black"
      style={{ color: color.textColor, backgroundColor: color.bgColor, borderColor: color.borderColor }}
    >
      <span className="truncate">#{tag.name}</span>
    </span>
  );
}
