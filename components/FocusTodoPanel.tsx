"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronUp, Circle, EyeOff, GripVertical, Plus } from "lucide-react";
import type { DragEvent, FormEvent } from "react";
import { useState } from "react";
import { type QuestTask } from "@/lib/quest-store";

export type FocusTodoPanelProps = {
  task?: QuestTask;
  title: string;
  setTitle: (title: string) => void;
  showCompleted: boolean;
  setShowCompleted: (showCompleted: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCreate: () => void;
  onToggle: (todoId: string) => void;
  onReorder: (todoId: string, targetTodoId: string) => void;
};

export function FocusTodoPanel({
  task,
  title,
  setTitle,
  showCompleted,
  setShowCompleted,
  onSubmit,
  onCreate,
  onToggle,
  onReorder,
}: FocusTodoPanelProps) {
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const todos = task?.todos ?? [];
  const openTodos = todos.filter((todo) => !todo.completedAt);
  const completedTodos = todos.filter((todo) => todo.completedAt);
  const visibleCompleted = showCompleted ? completedTodos : [];
  const visibleTodos = [...openTodos, ...visibleCompleted];

  const dropTodo = (event: DragEvent, targetTodoId: string) => {
    event.preventDefault();
    if (!dragTodoId || dragTodoId === targetTodoId) return;
    onReorder(dragTodoId, targetTodoId);
    setDragTodoId(null);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Todo List</h2>
          <p className="mt-1 text-sm text-slate-500">
            {task ? `当前任务下的具体待办 · ${openTodos.length} 未完成` : "选择任务后添加待办"}
          </p>
        </div>
        {completedTodos.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="focus-ring inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            {showCompleted ? <ChevronUp size={14} /> : <EyeOff size={14} />}
            {showCompleted ? "折叠完成" : `完成 ${completedTodos.length}`}
          </button>
        ) : null}
      </div>

      {task ? (
        <>
          <form onSubmit={onSubmit} className="mb-4 flex gap-2">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="新增这个任务下的 Todo"
              className="focus-ring min-h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={!title.trim()}
              className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </form>

          {visibleTodos.length > 0 ? (
            <div className="space-y-2">
              {visibleTodos.map((todo) => {
                const completed = Boolean(todo.completedAt);
                const dragging = dragTodoId === todo.id;
                return (
                  <motion.div
                    key={todo.id}
                    layout
                    draggable
                    onDragStart={() => setDragTodoId(todo.id)}
                    onDragEnd={() => setDragTodoId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropTodo(event, todo.id)}
                    className={`focus-ring flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      completed
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-emerald-200 bg-emerald-50/70 text-slate-800 hover:bg-emerald-100"
                    } ${dragging ? "opacity-50 ring-2 ring-emerald-300" : ""}`}
                  >
                    <span className="mt-0.5 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing" aria-label="拖动排序">
                      <GripVertical size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggle(todo.id)}
                      className="mt-0.5 shrink-0 rounded-full text-left"
                      aria-label={completed ? "恢复 Todo" : "完成 Todo"}
                    >
                      {completed ? (
                        <CheckCircle2 size={17} className="text-slate-400" />
                      ) : (
                        <Circle size={17} className="text-emerald-600" />
                      )}
                    </button>
                    <span className={`min-w-0 flex-1 break-words ${completed ? "line-through" : ""}`}>{todo.title}</span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              还没有待办，把任务拆成下一步行动吧
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          创建或选择一个 Quest 后可添加 Todo
        </div>
      )}
    </section>
  );
}
