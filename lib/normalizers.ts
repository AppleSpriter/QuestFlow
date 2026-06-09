import {
  type ClassName,
  type ClassState,
  type OwnedSkill,
  type SkillCheckResult,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toInteger = (value: unknown, fallback = 0) =>
  isNumber(value) ? Math.floor(value) : fallback;

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

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

const isSkillCheckResult = (value: unknown): value is SkillCheckResult => {
  if (!isRecord(value)) return false;
  return (
    typeof value.skillName === "string" &&
    isClassName(value.className) &&
    isNumber(value.classLevel) &&
    isNumber(value.dc) &&
    isNumber(value.roll) &&
    Array.isArray(value.naturalRolls) &&
    value.naturalRolls.every(isNumber) &&
    typeof value.advantageTriggered === "boolean" &&
    isNumber(value.modifier) &&
    typeof value.success === "boolean" &&
    typeof value.critical === "boolean" &&
    isNumber(value.xpBonus) &&
    typeof value.scrollEarned === "boolean" &&
    typeof value.scrollType === "string" &&
    isNumber(value.scrollCount) &&
    isNumber(value.bonusScrollChance)
  );
};

const isSkillUpgrade = (value: unknown): value is NonNullable<ProgressLog["skillUpgrade"]> =>
  isRecord(value) &&
  typeof value.name === "string" &&
  isNumber(value.fromTier) &&
  isNumber(value.toTier) &&
  isClassName(value.className);

const getOptionalNumber = (value: unknown) => isNumber(value) ? value : undefined;
const getOptionalString = (value: unknown) => typeof value === "string" ? value : undefined;

export const normalizeTodos = (todos: unknown): QuestTodoItem[] => {
  if (!Array.isArray(todos)) return [];

  return todos.reduce<QuestTodoItem[]>((items, todo) => {
    if (!isRecord(todo)) return items;
    const title = typeof todo.title === "string" ? todo.title.trim() : "";
    if (!title) return items;

    const createdAt = typeof todo.createdAt === "string" ? todo.createdAt : new Date().toISOString();
    const normalized: QuestTodoItem = {
      id: typeof todo.id === "string" ? todo.id : makeId(),
      title,
      createdAt
    };

    if (typeof todo.completedAt === "string") {
      normalized.completedAt = todo.completedAt;
    }

    items.push(normalized);
    return items;
  }, []);
};

export const normalizeTasks = (tasks: unknown): QuestTask[] => {
  if (!Array.isArray(tasks)) return [];

  return tasks.reduce<QuestTask[]>((items, task) => {
    if (!isRecord(task)) return items;
    const now = new Date().toISOString();
    const createdAt = typeof task.createdAt === "string" ? task.createdAt : now;
    const updatedAt =
      typeof task.updatedAt === "string"
        ? task.updatedAt
        : typeof task.lastFocusedAt === "string"
          ? task.lastFocusedAt
          : createdAt;

    const tags = Array.isArray(task.tags) ? task.tags.filter(isTaskTag) : [];

    items.push({
      id: typeof task.id === "string" ? task.id : makeId(),
      title: typeof task.title === "string" ? task.title : "Untitled Quest",
      progressCount: Math.max(0, toInteger(task.progressCount)),
      status: task.status === "paused" || task.status === "archived" ? task.status : "active",
      className: isClassName(task.className) ? task.className : "Wizard",
      tags,
      todos: normalizeTodos(task.todos),
      recurringCompletedAt: typeof task.recurringCompletedAt === "string" ? task.recurringCompletedAt : undefined,
      recurringCompletedKey: typeof task.recurringCompletedKey === "string" ? task.recurringCompletedKey : undefined,
      createdAt,
      updatedAt,
      lastFocusedAt: typeof task.lastFocusedAt === "string" ? task.lastFocusedAt : undefined
    });
    return items;
  }, []);
};

const inferLogClassName = (
  log: Record<string, unknown>,
  tasksById: Map<string, QuestTask>
): ClassName => {
  if (isClassName(log.className)) return log.className;
  if (isRecord(log.skillCheck) && isClassName(log.skillCheck.className)) return log.skillCheck.className;
  if (isRecord(log.skillUpgrade) && isClassName(log.skillUpgrade.className)) return log.skillUpgrade.className;
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
    if (!isRecord(tag)) return items;
    const name = typeof tag.name === "string" ? tag.name.trim() : "";
    if (!name || typeof tag.id !== "string") return items;
    items.push({
      id: tag.id,
      name,
      colorId: isProgressTagColorId(tag.colorId) ? tag.colorId : DEFAULT_PROGRESS_TAG_COLOR
    });
    return items;
  }, []);
};

export const normalizeProgressTags = (tags: unknown): ProgressTag[] => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();

  return tags.reduce<ProgressTag[]>((items, tag) => {
    if (!isRecord(tag)) return items;
    const name = typeof tag.name === "string" ? tag.name.trim() : "";
    if (!name) return items;
    const id = typeof tag.id === "string" && tag.id ? tag.id : makeId();
    if (seen.has(id)) return items;
    seen.add(id);
    const createdAt = typeof tag.createdAt === "string" ? tag.createdAt : new Date().toISOString();
    items.push({
      id,
      name,
      colorId: isProgressTagColorId(tag.colorId) ? tag.colorId : DEFAULT_PROGRESS_TAG_COLOR,
      createdAt,
      updatedAt: typeof tag.updatedAt === "string" ? tag.updatedAt : createdAt
    });
    return items;
  }, []);
};

export const normalizeFeatState = (featState: unknown): FeatState => {
  const initial = createInitialFeatState();
  if (!isRecord(featState)) return initial;

  const owned = Array.isArray(featState.owned)
    ? featState.owned.reduce<OwnedFeat[]>((items, feat) => {
        if (!isRecord(feat) || typeof feat.id !== "string" || !FEAT_MAP[feat.id] || !isClassName(feat.className)) return items;
        items.push({
          id: feat.id,
          className: feat.className,
          selectedAt: typeof feat.selectedAt === "string" ? feat.selectedAt : new Date().toISOString(),
          level: Math.max(4, toInteger(feat.level, 4))
        });
        return items;
      }, [])
    : [];
  const selectedIds = new Set(owned.map((feat) => feat.id));
  const pending = Array.isArray(featState.pending)
    ? featState.pending.reduce<PendingFeatChoice[]>((items, choice) => {
        if (!isRecord(choice)) return items;
        const choices = Array.isArray(choice.choices)
          ? choice.choices.filter((id): id is string => typeof id === "string" && !!FEAT_MAP[id] && !selectedIds.has(id)).slice(0, 3)
          : [];
        if (typeof choice.id !== "string" || !isClassName(choice.className) || choices.length === 0) return items;
        items.push({
          id: choice.id,
          className: choice.className,
          pointIndex: Math.max(1, toInteger(choice.pointIndex, 1)),
          level: Math.max(4, toInteger(choice.level, 4)),
          choices,
          createdAt: typeof choice.createdAt === "string" ? choice.createdAt : new Date().toISOString()
        });
        return items;
      }, [])
    : [];

  return {
    owned,
    pending,
    dailyAdvantageUsedAt: typeof featState.dailyAdvantageUsedAt === "string" ? featState.dailyAdvantageUsedAt : undefined,
    shortRestCount: Math.max(0, toInteger(featState.shortRestCount)),
    longRestCount: Math.max(0, toInteger(featState.longRestCount))
  };
};

export const normalizeClassStates = (classStates: unknown): Record<ClassName, ClassState> => {
  const initial: Record<ClassName, ClassState> = {} as Record<ClassName, ClassState>;
  for (const cn of classNames) {
    initial[cn] = { xp: 0, scrolls: 0, skills: [], fatigue: 0 };
  }

  const source = isRecord(classStates) ? classStates : {};
  const lineIds = getSkillLineIds();

  for (const cn of classNames) {
    const item = source[cn];
    if (!isRecord(item)) continue;
    const skills = Array.isArray(item.skills)
      ? item.skills
        .filter((skill): skill is OwnedSkill => {
          if (!isRecord(skill)) return false;
          return typeof skill.lineId === "string" && lineIds.has(skill.lineId);
        })
        .map((skill) => {
          const copies = Math.max(1, toInteger(skill.copies, 1));
          return {
            lineId: skill.lineId,
            copies,
            currentTier: getTierFromCopies(copies)
          };
        })
      : [];

    initial[cn] = {
      xp: Math.max(0, toInteger(item.xp)),
      scrolls: Math.max(0, toInteger(item.scrolls)),
      skills,
      fatigue: Math.min(120, Math.max(0, toInteger(item.fatigue)))
    };
  }

  return initial;
};

export const normalizeLogs = (logs: unknown, tasks: QuestTask[] = []): ProgressLog[] => {
  if (!Array.isArray(logs)) return [];

  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  return logs.reduce<ProgressLog[]>((items, log) => {
    if (!isRecord(log)) return items;
    const at = typeof log.at === "string" ? log.at : new Date().toISOString();
    const className = inferLogClassName(log, tasksById);
    const type: ProgressLogType =
      log.type === "scroll" || (log.taskId === "scroll" && (isNonEmptyString(log.newSkill) || isSkillUpgrade(log.skillUpgrade)))
        ? "scroll"
        : "progress";

    items.push({
      id: typeof log.id === "string" ? log.id : makeId(),
      type,
      taskId: typeof log.taskId === "string" ? log.taskId : type,
      className,
      note: typeof log.note === "string" ? log.note : type === "scroll" ? "使用卷轴" : "推进一步",
      at,
      xpAwarded: Math.max(0, toInteger(log.xpAwarded)),
      classXpAwarded: Math.max(0, toInteger(log.classXpAwarded)),
      progressCount: Math.max(0, toInteger(log.progressCount)),
      skillCheck: isSkillCheckResult(log.skillCheck) ? log.skillCheck : undefined,
      scrollEarned: getOptionalString(log.scrollEarned),
      scrollCount: getOptionalNumber(log.scrollCount),
      newSkill: getOptionalString(log.newSkill),
      skillUpgrade: isSkillUpgrade(log.skillUpgrade) ? log.skillUpgrade : undefined,
      fatigueBefore: getOptionalNumber(log.fatigueBefore),
      fatigueAfter: getOptionalNumber(log.fatigueAfter),
      synergyBonus: typeof log.synergyBonus === "boolean" ? log.synergyBonus : undefined,
      resonanceKey: getOptionalString(log.resonanceKey),
      resonanceName: getOptionalString(log.resonanceName),
      resonanceReward: getOptionalString(log.resonanceReward),
      todoId: getOptionalString(log.todoId),
      todoTitle: getOptionalString(log.todoTitle),
      progressTags: normalizeProgressTagSnapshots(log.progressTags)
    });
    return items;
  }, []);
};

export const normalizeOptionalString = (value: unknown) => isOptionalString(value) ? value : undefined;
export const isPlainRecord = isRecord;
