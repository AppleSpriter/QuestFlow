# QuestFlow AGENTS.md

> This file provides context for AI agents working on QuestFlow. Keep it in sync with code changes.

## Project Overview

QuestFlow is a client-side "progress tracker" with DnD class growth and RPG quest logging.
Core loop: push task → class XP → skill check → earn scrolls → learn/upgrade skill lines → manage fatigue → rest & summarize.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand with `persist` middleware (localStorage)
- **Icons**: lucide-react
- **Confetti**: react-confetti

## Directory Structure

```
app/
  globals.css              -- Global styles, CSS variables, particle/glow animations
  layout.tsx               -- Root layout (lang="zh-CN"), favicon via /logo.png
  page.tsx                 -- Main page UI, all animation queues, task CRUD, rest UI
  api/webdav/              -- WebDAV proxy route handlers
  sync/page.tsx            -- Cloud sync configuration page
lib/
  quest-store.ts           -- Zustand store: all state, gamification logic, migrations
data/
  classes.ts               -- Class definitions, skill lines, skill checks, fatigue, tags, tier system
components/
  SkillCheckToast.tsx      -- Skill check result toast (dice roll/success/failure/scroll/synergy)
  ScrollReveal.tsx         -- Scroll opening animation (skill reveal/tier upgrade)
  Spellbook.tsx            -- Spellbook modal (class list/skill lines/scroll use, with animation queue)
  TaskMapProgress.tsx      -- Quest map region progress bar
public/
  logo.png                 -- App logo (also used as favicon)
```

## Data Persistence

- All data in browser `localStorage`, key `"questflow-v1"`
- Zustand `persist` middleware + `createJSONStorage(() => localStorage)`
- WebDAV sync available via `/api/webdav` proxy and `/sync` config page
- **Persist version: 7** (migration chain: v1 → v3 → v4 → v5 → v6 → v7)

### Store Schema (v7)

| Field | Type | Description |
|-------|------|-------------|
| tasks | QuestTask[] | All tasks: id, title, progressCount, status, className, tags, timestamps |
| logs | ProgressLog[] | Progress history: note, xpAwarded, classXpAwarded, skillCheck, scrollEarned, fatigue, synergyBonus |
| focusTaskId | string \| undefined | Currently focused task ID |
| totalXp | number | Total XP across all classes |
| streak | { count: number; lastProgressDate?: string } | Consecutive day streak |
| momentumTaskId | string \| undefined | Task building momentum |
| momentumCount | number | Momentum counter for current task |
| classStates | Record\<ClassName, ClassState\> | Per-class state (xp, scrolls, skills, fatigue) |
| lastProgressDate | string \| undefined | Last progress date (daily first-push check) |
| lastProgressClass | ClassName \| undefined | Last class that was pushed (for synergy detection) |
| restState | RestState \| undefined | Active rest (short/long, startedAt, endsAt) |
| dataUpdatedAt | string \| undefined | Last data change timestamp (for WebDAV sync) |
| lastSyncedAt | string \| undefined | Last successful WebDAV sync timestamp |

### Key Types

```ts
type ClassState = {
  xp: number;
  scrolls: number;
  skills: OwnedSkill[];  // learned skill lines
  fatigue: number;        // 0~100
}

type QuestTask = {
  id: string;
  title: string;
  progressCount: number;
  status: QuestStatus;     // "active" | "paused" | "archived"
  className: ClassName;
  tags: TaskTag[];          // "important" | "urgent"
  createdAt: string;
  updatedAt: string;
  lastFocusedAt?: string;
}

type ProgressLog = {
  id: string;
  taskId: string;
  note: string;
  at: string;
  xpAwarded: number;
  classXpAwarded: number;
  progressCount: number;
  skillCheck?: SkillCheckResult;
  scrollEarned?: string;
  scrollCount?: number;
  newSkill?: string;
  skillUpgrade?: { name: string; fromTier: number; toTier: number; className: ClassName };
  fatigueBefore?: number;
  fatigueAfter?: number;
  synergyBonus?: boolean;
}

type RestState = {
  type: "short" | "long";
  startedAt: string;
  endsAt: string;
}
```

## Class System

Defined in `data/classes.ts`, 5 classes each bound to a work type:

| Class | Work Type | Scroll | Check Skills | Hex Color |
|-------|-----------|--------|--------------|-----------|
| Wizard | 策略迭代 | 奥术卷轴 | 奥术/调查/历史/自然 | #7c3aed |
| Fighter | AI内化 | 战技卷轴 | 运动/威吓/察觉/生存 | #b91c1c |
| Rogue | 客户投放 | 诡术卷轴 | 隐匿/巧手/调查/察觉 | #334155 |
| Bard | 问题解决 | 灵感卷轴 | 说服/欺瞒/表演/历史 | #b45309 |
| Cleric | 知识整理 | 神恩卷轴 | 宗教/医疗/洞察/说服 | #0369a1 |

`CLASS_META` has both Tailwind classes (`color`, `bgColor`, `borderColor`) and `hexColor` for inline styles (avoids Tailwind dynamic class issues).

## Skill Line System

Each class has 5 skill lines (SkillLine), each with 9 tier skill names. Total: 25 lines, 225 skills.

### Tier Formula

Tier n requires **2^(n-1) copies** of the same line:

| Tier | Copies Required | Cumulative Scrolls |
|------|----------------|--------------------|
| 1 | 1 | 1 |
| 2 | 2 | 3 |
| 3 | 4 | 7 |
| 4 | 8 | 15 |
| 5 | 16 | 31 |
| 6 | 32 | 63 |
| 7 | 64 | 127 |
| 8 | 128 | 255 |
| 9 | 256 | 511 |

Key functions: `getTierFromCopies()`, `getCopiesForTier()`, `getNextTierCopies()`

## Skill Check System

Triggered on every `progressTask` call:

- d20 + floor(classLevel / 2) vs DC 10~15
- Natural 20 → Critical: +10 XP, 2 scrolls (double)
- Total >= DC → Success: +5 XP, 1 scroll
- Total < DC → Failure: no extra reward

`SkillCheckResult` records: dc, roll, modifier, naturalRolls, advantageTriggered, success, critical, scrollCount.

## Task Tag System

Tasks can have tags: `important` and/or `urgent` (or none).

| Tag | Bonus XP | UI Color |
|-----|----------|----------|
| important | +3 XP | Blue (#1d4ed8) |
| urgent | +2 XP | Red (#b91c1c) |
| both | +5 XP | Purple |

`TAG_META` uses hex values with inline styles to avoid Tailwind dynamic class issues.

## Fatigue System

Each class has independent fatigue (0~100). Each progress action adds +5 fatigue.

| Fatigue | Stage | Emoji | Color | Reward Multiplier |
|---------|-------|-------|-------|-------------------|
| 0~30 | 精力充沛 | 🟢 | #10b981 | 100% |
| 31~60 | 轻度疲劳 | 🟡 | #eab308 | 90% |
| 61~80 | 疲劳 | 🟠 | #f97316 | 75% |
| 81~100 | 极度疲劳 | 🔴 | #ef4444 | 50% |

Fatigue multiplier applies to all XP (base + tag + momentum + milestone + synergy).

## Rest System

- **Short Rest**: 5 min, all classes recover -30 fatigue
- **Long Rest**: 15 min, all classes fatigue → 0, triggers summary page

Rest flow: start → countdown (with "early finish" button) → confirmation modal → `completeRest()`.

### Long Rest Summary (`LongRestSummary`)

Shows: per-class progress/skills/XP/scrolls today, total XP, total scrolls, streak days.

## Party Synergy

When consecutive progress actions use different classes, Party Synergy triggers:
- +10 XP bonus
- +1 extra scroll (capped at 3 total)

Detected via `lastProgressClass` field in store.

## Reward Calculation (progressTask)

```
baseXp = round((5 + tagBonus + momentumBonus + milestoneBonus + synergyBonusXp) × fatigueMultiplier)
classXpAwarded = round(5 × fatigueMultiplier)
```

Scroll reward: success = 1, critical = 2, synergy adds +1 (max 3).

## Scroll Use Flow

1. User clicks scroll button in Spellbook
2. `useScroll(className)` calls `learnSkillFromScroll()`
3. If unlearned lines exist → random pick, start at tier 1
4. If all lines learned → random pick, add copy
5. Copies reach 2^(n-1) threshold → auto tier-up
6. `ScrollReveal` animation queued and played sequentially

## Animation Queue System

All animations use refs-based queues to prevent overlap when users click rapidly:

- **ProgressBurst** (`+1` burst): `progressQueueRef` → `enqueueProgress()`, 1200ms per item + 180ms gap
- **SkillCheckToast** (dice roll result): `skillCheckQueueRef` → `enqueueSkillCheck()`, 3000ms per item + 180ms gap
- **ScrollReveal** (scroll opening): `scrollRevealQueueRef` (in Spellbook.tsx) → `enqueueScrollReveal()`, 2800ms per item + 180ms gap

Each queue: push to ref array → `playNext*()` checks `playingRef` flag → plays → setTimeout clears → next with gap.

## Component Tree

```
page.tsx
  ├── SkillCheckToast        ← skill check result (dice/success/scroll/synergy)
  ├── FocusPanel             ← focused task + push button
  │   ├── TaskMapProgress    ← map region progress
  │   └── ProgressBurst      ← particle burst + XP float text
  ├── QuestCard[]            ← task cards (title color matches class hexColor)
  │   └── TaskMapProgress    ← map region progress
  ├── ProgressLogPanel       ← right-side progress log (shows DC, roll, modifier)
  ├── RestUI                 ← rest countdown + confirmation
  ├── LongRestSummaryModal   ← daily adventure summary
  ├── PartyStatus            ← top bar with per-class fatigue bars
  └── Spellbook              ← spellbook modal (on-demand)
      └── ScrollReveal       ← scroll opening animation
```

## Data Migration (v1→v7)

Zustand persist `version: 7`, `migrate` function handles:

- **v1→v3**: Add totalXp, classStates, lastProgressDate; remove xp/crystals/companions/gachaHistory
- **v3→v4**: Recalculate all skill tiers using 2^(n-1) formula
- **v4→v5**: Skill structure from skillId to lineId, reset all skills (incompatible)
- **v5→v6**: Add dataUpdatedAt, lastSyncedAt (WebDAV sync fields)
- **v6→v7**: Add fatigue to class states, normalize task tags, add lastProgressClass, reset restState

## Key Conventions

- **Inline styles for dynamic colors**: Use `style={{ color: CLASS_META[cn].hexColor }}` instead of Tailwind dynamic classes. Tailwind only scans `app/`, `components/`, `lib/` — not `data/`. Dynamic class names from `data/classes.ts` won't be generated.
- **Animation queues**: Never set animation state directly on user action; always enqueue via refs to prevent overlap.
- **Zustand for data clearing**: Use `clearAll()` action, not direct `localStorage.removeItem()` (persist middleware may rewrite on unmount).
- **Store actions are the single source of truth**: All state mutations go through Zustand actions in `quest-store.ts`.
- **Task class mapping**: `getTaskClass(task)` determines which class a task belongs to (from `task.className`).
