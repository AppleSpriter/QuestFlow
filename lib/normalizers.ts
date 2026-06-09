import {
  type ClassName,
  type ClassState,
  type OwnedSkill,
  type TaskTag,
  ALL_CLASSES,
  CLASS_META,
  getTierFromCopies,
  SKILL_LINES,
} from "@/data/classes";
import {
  type FeatState,
  type OwnedFeat,
  type PendingFeatChoice,
  FEAT_MAP,
  createInitialFeatState,
} from "@/data/feats";
import {
  DEFAULT_PROGRESS_TAG_COLOR,
  PROGRESS_TAG_COLORS,
} from "./quest-store";
import type {
  ProgressLogType,
  ProgressTag,
  ProgressTagColorId,
  ProgressTagSnapshot,
  QuestTask,
  QuestTodoItem,
  ProgressLog,
} from "./types";

const classNames: ClassName[] = ALL_CLASSES;

const getSkillLineIds = () => new Set(SKILL_LINES.map((line) => line.id));

export const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const isClassName = (value: unknown): value is ClassName =>
  typeof value === "string" && classNames.includes(value as ClassName);

export const isTaskTag = (value: unknown): value is TaskTag =>
  value === "important" || value === "urgent" || value === "daily" || value === "weekly";

export const isProgressTagColorId = (value: unknown): value is ProgressTagColorId =>
  typeof value === "string" && value in PROGRESS_TAG_COLORS;

export const normalizeTodos = (todos: unknown): QuestTodoItem[] => {
  if (!Array.isArray(todos)) return [];

  return todos.reduce<QuestTodoItem[]>((items, todo) => {
    const item = todo as Partial<QuestTodoItem>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) return items;

    const createdAt = typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString();
    const normalized: QuestTodoItem = {
      id: typeof item.id === "string" ? item.id : makeId(),
      title,
      createdAt
    };

    if (typeof item.completedAt === "string") {
      normalized.completedAt = item.completedAt;
    }

    items.push(normalized);
    return items;
  }, []);
};

export const normalizeTasks = (tasks: unknown): QuestTask[] => {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task) => {
    const item = task as Partial<QuestTask>;
    const now = new Date().toISOString();
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : now;
    const updatedAt =
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : typeof item.lastFocusedAt === "string"
          ? item.lastFocusedAt
          : createdAt;

    const tags = Array.isArray(item.tags) ? item.tags.filter(isTaskTag) : [];

    return {
      id: typeof item.id === "string" ? item.id : makeId(),
      title: typeof item.title === "string" ? item.title : "Untitled Quest",
      progressCount: typeof item.progressCount === "number" ? item.progressCount : 0,
      status: item.status === "paused" || item.status === "archived" ? item.status : "active",
      className: isClassName(item.className) ? item.className : "Wizard",
      tags,
      todos: normalizeTodos(item.todos),
      recurringCompletedAt: typeof item.recurringCompletedAt === "string" ? item.recurringCompletedAt : undefined,
      recurringCompletedKey: typeof item.recurringCompletedKey === "string" ? item.recurringCompletedKey : undefined,
      createdAt,
      updatedAt,
      lastFocusedAt: typeof item.lastFocusedAt === "string" ? item.lastFocusedAt : undefined
    };
  });
};

const inferLogClassName = (
  log: Partial<{ className: ClassName; skillCheck?: { className?: ClassName }; skillUpgrade?: { className?: ClassName }; scrollEarned?: string; taskId?: string }>,
  tasksById: Map<string, QuestTask>
): ClassName => {
  if (isClassName(log.className)) return log.className;
  if (isClassName(log.skillCheck?.className)) return log.skillCheck!.className!;
  if (log.skillUpgrade && isClassName(log.skillUpgrade.className)) return log.skillUpgrade.className;
  const scrollClass = typeof log.scrollEarned === "string"
    ? classNames.find((cn) => log.scrollEarned === CLASS_META[cn].scrollName)
    : undefined;
  if (scrollClass) return scrollClass;
  if (typeof log.taskId === "string") {
    const taskClass = tasksById.get(log.taskId)?.className;
    if (isClassName(taskClass)) return taskClass;
  }
  return "Wizard";
};

export const normalizeProgressTagSnapshots = (tags: unknown): ProgressTagSnapshot[] => {
  if (!Array.isArray(tags)) return [];
  return tags.reduce<ProgressTagSnapshot[]>((items, tag) => {
    const item = tag as Partial<ProgressTagSnapshot>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name || typeof item.id !== "string") return items;
    items.push({
      id: item.id,
      name,
      colorId: isProgressTagColorId(item.colorId) ? item.colorId : DEFAULT_PROGRESS_TAG_COLOR
    });
    return items;
  }, []);
};

export const normalizeProgressTags = (tags: unknown): ProgressTag[] => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();

  return tags.reduce<ProgressTag[]>((items, tag) => {
    const item = tag as Partial<ProgressTag>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return items;
    const id = typeof item.id === "string" && item.id ? item.id : makeId();
    if (seen.has(id)) return items;
    seen.add(id);
    const createdAt = typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString();
    items.push({
      id,
      name,
      colorId: isProgressTagColorId(item.colorId) ? item.colorId : DEFAULT_PROGRESS_TAG_COLOR,
      createdAt,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : createdAt
    });
    return items;
  }, []);
};

export const normalizeFeatState = (featState: unknown): FeatState => {
  const initial = createInitialFeatState();
  if (!featState || typeof featState !== "object") return initial;

  const source = featState as Partial<FeatState>;
  const owned = Array.isArray(source.owned)
    ? source.owned.reduce<OwnedFeat[]>((items, feat) => {
        const item = feat as Partial<OwnedFeat>;
        if (!item.id || !FEAT_MAP[item.id] || !isClassName(item.className)) return items;
        items.push({
          id: item.id,
          className: item.className,
          selectedAt: typeof item.selectedAt === "string" ? item.selectedAt : new Date().toISOString(),
          level: Math.max(4, Math.floor(Number(item.level) || 4))
        });
        return items;
      }, [])
    : [];
  const selectedIds = new Set(owned.map((feat) => feat.id));
  const pending = Array.isArray(source.pending)
    ? source.pending.reduce<PendingFeatChoice[]>((items, choice) => {
        const item = choice as Partial<PendingFeatChoice>;
        const choices = Array.isArray(item.choices)
          ? item.choices.filter((id): id is string => typeof id === "string" && !!FEAT_MAP[id] && !selectedIds.has(id)).slice(0, 3)
          : [];
        if (!item.id || !isClassName(item.className) || choices.length === 0) return items;
        items.push({
          id: item.id,
          className: item.className,
          pointIndex: Math.max(1, Math.floor(Number(item.pointIndex) || 1)),
          level: Math.max(4, Math.floor(Number(item.level) || 4)),
          choices,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
        });
        return items;
      }, [])
    : [];

  return {
    owned,
    pending,
    dailyAdvantageUsedAt: typeof source.dailyAdvantageUsedAt === "string" ? source.dailyAdvantageUsedAt : undefined,
    shortRestCount: Math.max(0, Math.floor(Number(source.shortRestCount) || 0)),
    longRestCount: Math.max(0, Math.floor(Number(source.longRestCount) || 0))
  };
};

export const normalizeClassStates = (classStates: unknown): Record<ClassName, ClassState> => {
  const initial: Record<ClassName, ClassState> = {} as Record<ClassName, ClassState>;
  // Initialize all classes
  for (const cn of classNames) {
    initial[cn] = { xp: 0, scrolls: 0, skills: [], fatigue: 0 };
  }

  const source = classStates && typeof classStates === "object" ? classStates as Record<string, Partial<ClassState>> : {};
  const lineIds = getSkillLineIds();

  for (const cn of classNames) {
    const item = source[cn];
    if (!item) continue;
    const skills = Array.isArray(item.skills)
      ? item.skills
        .filter((skill): skill is OwnedSkill => {
          const candidate = skill as Partial<OwnedSkill>;
          return typeof candidate.lineId === "string" && lineIds.has(candidate.lineId);
        })
        .map((skill) => {
          const copies = Math.max(1, Math.floor(Number(skill.copies) || 1));
          return {
            lineId: skill.lineId,
            copies,
            currentTier: getTierFromCopies(copies)
          };
        })
      : [];

    initial[cn] = {
      xp: Math.max(0, Math.floor(Number(item.xp) || 0)),
      scrolls: Math.max(0, Math.floor(Number(item.scrolls) || 0)),
      skills,
      fatigue: Math.min(120, Math.max(0, Math.floor(Number(item.fatigue) || 0)))
    };
  }

  return initial;
};

export const normalizeLogs = (logs: unknown, tasks: QuestTask[] = []): ProgressLog[] => {
  if (!Array.isArray(logs)) return [];

  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  return logs.map((log): ProgressLog => {
    const item = log as Record<string, unknown>;
    const at = typeof item.at === "string" ? item.at : new Date().toISOString();
    const className = inferLogClassName(item as Parameters<typeof inferLogClassName>[0], tasksById);
    const type: ProgressLogType =
      item.type === "scroll" || (item.taskId === "scroll" && (item.newSkill || item.skillUpgrade))
        ? "scroll"
        : "progress";

    return {
      id: typeof item.id === "string" ? item.id : makeId(),
      type,
      taskId: typeof item.taskId === "string" ? item.taskId : type,
      className,
      note: typeof item.note === "string" ? item.note : type === "scroll" ? "使用卷轴" : "推进一步",
      at,
      xpAwarded: Math.max(0, Math.floor(Number(item.xpAwarded) || 0)),
      classXpAwarded: Math.max(0, Math.floor(Number(item.classXpAwarded) || 0)),
      progressCount: Math.max(0, Math.floor(Number(item.progressCount) || 0)),
      skillCheck: item.skillCheck as ProgressLog["skillCheck"],
      scrollEarned: typeof item.scrollEarned === "string" ? item.scrollEarned : undefined,
      scrollCount: typeof item.scrollCount === "number" ? item.scrollCount : undefined,
      newSkill: typeof item.newSkill === "string" ? item.newSkill : undefined,
      skillUpgrade: item.skillUpgrade as ProgressLog["skillUpgrade"],
      fatigueBefore: typeof item.fatigueBefore === "number" ? item.fatigueBefore : undefined,
      fatigueAfter: typeof item.fatigueAfter === "number" ? item.fatigueAfter : undefined,
      synergyBonus: typeof item.synergyBonus === "boolean" ? item.synergyBonus : undefined,
      resonanceKey: typeof item.resonanceKey === "string" ? item.resonanceKey : undefined,
      resonanceName: typeof item.resonanceName === "string" ? item.resonanceName : undefined,
      resonanceReward: typeof item.resonanceReward === "string" ? item.resonanceReward : undefined,
      todoId: typeof item.todoId === "string" ? item.todoId : undefined,
      todoTitle: typeof item.todoTitle === "string" ? item.todoTitle : undefined,
      progressTags: normalizeProgressTagSnapshots(item.progressTags)
    };
  });
};
