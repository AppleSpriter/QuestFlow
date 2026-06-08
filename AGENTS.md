# QuestFlow AGENTS.md

> This file provides context for AI agents working on QuestFlow. Keep it in sync with code changes.

## Project Overview

QuestFlow is a client-side "progress tracker" with DnD class growth and RPG quest logging.
Core loop: push task → class XP → skill check → earn scrolls → learn/upgrade skill lines → class levels → permanent feats → automatic Build detection → rest & summarize.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand with `persist` middleware (localStorage)
- **Icons**: lucide-react
- **Confetti**: react-confetti
- **Desktop**: Electron + electron-builder

## Directory Structure

```
app/
  globals.css              -- Global styles, CSS variables, particle/glow animations
  layout.tsx               -- Root layout (lang="zh-CN"), favicon via /logo.png
  page.tsx                 -- Main page UI, all animation queues, task CRUD, rest UI
  api/webdav/              -- WebDAV proxy route handlers
  sync/page.tsx            -- Cloud sync configuration page
  resonance/page.tsx       -- Class resonance temple matrix / collection page
  build/page.tsx           -- Feat and automatic Build overview page
  tags/page.tsx            -- Reusable Progress tag management page
lib/
  quest-store.ts           -- Zustand store: all state, gamification logic, migrations
  server/webdav-config.ts  -- Server-side WebDAV config resolution/local config file helpers
data/
  classes.ts               -- Class definitions, skill lines, skill checks, fatigue, tags, tier system
  resonance.ts             -- 66 class resonance definitions, rewards, badges, levels, chain helpers
  feats.ts                 -- Feat definitions, quality/flow metadata, feat choice and Build helpers
components/
  SkillCheckToast.tsx      -- Skill check result toast (dice roll/success/failure/scroll/synergy)
  ScrollReveal.tsx         -- Scroll opening animation (skill reveal/tier upgrade)
  Spellbook.tsx            -- Spellbook modal (class list/skill lines/scroll use, with animation queue)
  TaskMapProgress.tsx      -- Quest map region progress bar
electron/
  main.js                  -- Electron main process, packaged Next standalone server launcher
build/
  icon.icns / icon.ico     -- Desktop app icons for macOS/Windows packaging
public/
  logo.png                 -- App logo (also used as favicon)
CHANGELOG.md               -- Release/development progress source of truth
package.json               -- Scripts, npm package version, electron-builder config
```

## Versioning and Packaging

- The packaged app version in `package.json` must track the latest current development entry in `CHANGELOG.md`.
- Example: when the newest changelog milestone is `v1.8`, package builds should use `version: "1.8.0"`.
- Keep README/AGENTS/changelog/package version notes aligned when a release milestone changes.
- Desktop scripts:
  - `npm run desktop:dev`: run Next on port 3100 and launch Electron against it.
  - `npm run desktop:dir`: build Next and create an unpacked Electron app directory.
  - `npm run desktop:build`: build the macOS DMG/ZIP targets.
  - `npm run desktop:build:win`: build the Windows NSIS/ZIP x64 targets.
- Packaged Electron starts the Next standalone server from `process.resourcesPath/next/server.js`, binds it to `127.0.0.1`, and passes `QUESTFLOW_WEBDAV_CONFIG` to keep desktop WebDAV config in Electron `userData`.

## Data Persistence

- All data in browser `localStorage`, key `"questflow-v1"`
- Zustand `persist` middleware + `createJSONStorage(() => localStorage)`
- WebDAV sync available via `/api/webdav` proxy and `/sync` config page
- WebDAV config is resolved server-side in `lib/server/webdav-config.ts`; do not store credentials in Zustand/browser state.
- **Persist version: 14** (migration chain: v1 → v3 → v4 → v5 → v6 → v7 → v8 → v9 → v10 → v11 → v12 → v13 → v14)

### Store Schema (v14)

| Field | Type | Description |
|-------|------|-------------|
| tasks | QuestTask[] | All tasks: id, title, progressCount, status, className, tags, per-task todos, timestamps |
| logs | ProgressLog[] | Progress/scroll history: type, className, note, progressTags, XP, skillCheck, scroll changes, skill events, fatigue, resonance |
| progressTags | ProgressTag[] | User-configured reusable Progress tags with preset color IDs |
| focusTaskId | string \| undefined | Currently focused task ID |
| totalXp | number | Total XP across all classes |
| streak | { count: number; lastProgressDate?: string } | Consecutive day streak |
| momentumTaskId | string \| undefined | Task building momentum |
| momentumCount | number | Momentum counter for current task |
| classStates | Record\<ClassName, ClassState\> | Per-class state (xp, scrolls, skills, fatigue) |
| lastProgressDate | string \| undefined | Last progress date (daily first-push check) |
| lastProgressClass | ClassName \| undefined | Last class that was pushed (for resonance detection) |
| restState | RestState \| undefined | Active rest (short/long, startedAt, endsAt) |
| discoveredResonances | Record<string, DiscoveredResonance> | Unlocked class resonance combos, discovery time, trigger count |
| resonanceBuffs | ResonanceBuffs | Pending resonance buffs: advantage/lucky/double-scroll/long-rest-scroll |
| resonanceChain | ResonanceChainState | Consecutive cross-class progress chain counter |
| featState | FeatState | Permanent selected feats, pending 3-choice feat points, daily feat usage and rest counters |
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
  todos: QuestTodoItem[];   // task-level checklist; completing one triggers progress
  createdAt: string;
  updatedAt: string;
  lastFocusedAt?: string;
}

type ProgressLog = {
  id: string;
  type: "progress" | "scroll";
  taskId: string;
  className: ClassName;
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
  resonanceKey?: string;
  resonanceName?: string;
  resonanceReward?: string;
  todoId?: string;
  todoTitle?: string;
  progressTags?: ProgressTagSnapshot[];
}

type ProgressTag = {
  id: string;
  name: string;
  colorId: "blue" | "emerald" | "violet" | "amber" | "rose" | "sky" | "slate";
  createdAt: string;
  updatedAt: string;
}

type ProgressTagSnapshot = Pick<ProgressTag, "id" | "name" | "colorId">

type DiscoveredResonance = {
  key: string;
  discoveredAt: string;
  triggerCount: number;
}

type ResonanceBuffs = {
  advantageChecks: number;
  luckyChecks: number;
  doubleScrolls: number;
  longRestScrolls: number;
}

type ResonanceChainState = {
  count: number;
  lastClass?: ClassName;
}

type RestState = {
  type: "short" | "long";
  startedAt: string;
  endsAt: string;
}

type FeatState = {
  owned: OwnedFeat[];
  pending: PendingFeatChoice[];
  dailyAdvantageUsedAt?: string;
  shortRestCount: number;
  longRestCount: number;
}
```

### Backup Contract

- `QUESTFLOW_BACKUP_VERSION` and `QUESTFLOW_COMPATIBILITY_VERSION` are both `14`.
- `getBackupData()` returns a `QuestBackup` with `app: "questflow"`, version, exported/updated timestamps, tasks, logs, focus, streak, class states, sync fields, resonance collection, resonance buffs, resonance chain, and feat state.
- `updatedAt` is derived from `dataUpdatedAt`, task `updatedAt`, and log `at` so WebDAV conflict checks can compare local vs remote freshness.
- `importData()` normalizes tasks and class states before writing to Zustand; use it for local file import and WebDAV restore instead of manually assigning persisted data.
- If the store schema changes, bump the persist/backup version together and add a migration path before changing sync or import behavior.

## Class System

Defined in `data/classes.ts`, 12 classes each bound to a work type/persona:

| Class | Work Type | Scroll | Check Skills | Hex Color |
|-------|-----------|--------|--------------|-----------|
| Wizard | 策略迭代 | 奥术卷轴 | 奥术/调查/历史/自然 | #7c3aed |
| Fighter | AI内化 | 战技卷轴 | 运动/威吓/察觉/生存 | #b91c1c |
| Rogue | 客户投放 | 诡术卷轴 | 隐匿/巧手/调查/察觉 | #334155 |
| Bard | 问题解决 | 灵感卷轴 | 说服/欺瞒/表演/历史 | #b45309 |
| Cleric | 知识整理 | 神恩卷轴 | 宗教/医疗/洞察/说服 | #0369a1 |
| Paladin | 守护承诺 | 誓言卷轴 | 宗教/说服/威吓/洞察 | #a16207 |
| Ranger | 自驱追踪 | 狩猎卷轴 | 生存/自然/察觉/隐匿 | #047857 |
| Druid | 生态平衡 | 自然卷轴 | 自然/医疗/动物驯养/洞察 | #4d7c0f |
| Warlock | 契约协作 | 契约卷轴 | 奥术/欺瞒/威吓/宗教 | #a21caf |
| Sorcerer | 天赋直觉 | 血脉卷轴 | 奥术/说服/洞察/威吓 | #c2410c |
| Monk | 自律修炼 | 气脉卷轴 | 运动/察觉/洞察/杂技 | #0f766e |
| Barbarian | 全力突破 | 狂怒卷轴 | 运动/威吓/生存/察觉 | #57534e |

`CLASS_META` has both Tailwind classes (`color`, `bgColor`, `borderColor`) and `hexColor` for inline styles (avoids Tailwind dynamic class issues).

## Skill Line System

Each class has 5 skill lines (SkillLine), each with 9 tier skill names. Total: 60 lines, 540 skills.

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

## Feat and Build System

Defined in `data/feats.ts`, each class earns one permanent feat point at Lv4/Lv8/Lv12/Lv16...

- Feat choices are stored in `featState.pending`; each point presents 3 deterministic choices.
- Selected feats are stored in `featState.owned` and are not resettable in v1.8.
- Feat selection uses a two-step confirmation flow; the modal can be dismissed and pending choices can be completed later on `/build`.
- Feat flows: learning, focus, luck, resonance, collection, rest.
- Feat qualities: common, rare, epic, legendary.
- `/build` automatically detects Build routes from feats, class XP, resonance trigger counts, rest counters and skill collection rate, and also surfaces pending feat choices.
- Reward hooks live in store actions: `progressTask()`, `useScroll()`, and `completeRest()`.

## Skill Check System

Each `progressTask` call has a 50% chance to trigger a skill check:

- d20 + floor(classLevel / 2) vs DC 10~15
- Natural 20 → Critical: +10 XP, 2 scrolls (double)
- Total >= DC → Success: +5 XP, 1 scroll
- Total < DC → Failure: no extra reward
- Resonance `advantage` and `lucky` buffs apply to the next triggered skill check, not necessarily the next progress action.

`SkillCheckResult` records: dc, roll, modifier, naturalRolls, advantageTriggered, success, critical, scrollCount.

## Task Tag System

Tasks can have tags: `important` and/or `urgent` (or none).

| Tag | Bonus XP | UI Color |
|-----|----------|----------|
| important | +3 XP | Blue (#1d4ed8) |
| urgent | +2 XP | Red (#b91c1c) |
| both | +5 XP | Purple |

`TAG_META` uses hex values with inline styles to avoid Tailwind dynamic class issues.

Progress tags are user-configured labels for progress logs, managed on `/tags`. They use `PROGRESS_TAG_COLORS`, do not affect XP, and are copied to `ProgressLog.progressTags` as snapshots so historical logs survive tag edits/deletes.

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

Per-class attribution uses `ProgressLog.className`; scroll-use logs (`type: "scroll"`) are included for skill events but excluded from progress counts and XP totals.

## Class Resonance System

When consecutive progress actions use different classes, Class Resonance triggers via `lastProgressClass !== currentClass`.

- There are 12 classes, so 66 unique unordered pair resonances (`A+B` equals `B+A`).
- Definitions live in `data/resonance.ts` with name, badge, reward, description, and level helpers.
- Unlocked resonances are stored in `discoveredResonances` with `discoveredAt` and `triggerCount`.
- `/resonance` shows the Resonance Temple matrix: locked `?`, disabled same-class diagonal, unlocked badge/name/Lv.

### Resonance Rewards

| Reward | Effect |
|--------|--------|
| `xp` | +3 XP on current progress |
| `scroll` | +1 scroll immediately |
| `fatigue` | current class fatigue -10 after progress |
| `advantage` | next skill check rolls with Advantage |
| `lucky` | next skill check has +5% critical chance |
| `doubleScroll` | next scroll reward +1 |
| `longRestScroll` | next long rest grants +1 scroll to last-progress class |

### Resonance Levels and Chain

- Resonance levels are based on trigger count: Lv1=1, Lv2=5, Lv3=20, Lv4=50, Lv5=100.
- Level-up triggers a lightweight “共鸣升级” notice in the normal resonance effect.
- Consecutive cross-class progress increments `resonanceChain.count`; reaching x5 grants an extra scroll.

## Reward Calculation (progressTask)

```
baseXp = round((5 + tagBonus + momentumBonus + milestoneBonus + resonanceBonusXp) × fatigueMultiplier)
classXpAwarded = round(5 × fatigueMultiplier)
```

Scroll reward: skill-check success/critical + resonance immediate scroll + double-scroll buff + chain bonus.

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
- **NormalResonanceEffect**: lightweight 1s non-blocking right-side resonance animation
- **NewResonanceModal**: 2~3s discovery modal for first-time resonance unlock
- **ScrollReveal** (scroll opening): `scrollRevealQueueRef` (in Spellbook.tsx) → `enqueueScrollReveal()`, 2800ms per item + 180ms gap

Each queue: push to ref array → `playNext*()` checks `playingRef` flag → plays → setTimeout clears → next with gap.

## Component Tree

```
page.tsx
  ├── SkillCheckToast        ← skill check result (dice/success/failure/scroll/resonance)
  ├── NewResonanceModal      ← first-time resonance discovery modal
  ├── NormalResonanceEffect  ← regular resonance trigger effect
  ├── FocusPanel             ← focused task + push button
  │   ├── TaskMapProgress    ← map region progress
  │   └── ProgressBurst      ← particle burst + XP float text
  ├── QuestCard[]            ← task cards (title color matches class hexColor)
  │   └── QuestProgressBadge ← compact map region badge
  ├── ProgressLogPanel       ← right-side progress log (shows DC, roll, modifier, Progress tags)
  ├── RestUI                 ← rest countdown + confirmation
  ├── LongRestSummaryModal   ← daily adventure summary
  ├── PartyStatus            ← top bar with per-class fatigue bars
  └── Spellbook              ← spellbook modal (on-demand)
      └── ScrollReveal       ← scroll opening animation
```

## Data Migration (v1→v14)

Zustand persist `version: 14`, `migrate` function handles:

- **v1→v3**: Add totalXp, classStates, lastProgressDate; remove xp/crystals/companions/gachaHistory
- **v3→v4**: Recalculate all skill tiers using 2^(n-1) formula
- **v4→v5**: Skill structure from skillId to lineId, reset all skills (incompatible)
- **v5→v6**: Add dataUpdatedAt, lastSyncedAt (WebDAV sync fields)
- **v6→v7**: Add fatigue to class states, normalize task tags, add lastProgressClass, reset restState
- **v7→v8**: Add 7 new classes and class states
- **v8→v9**: Add resonance collection and pending resonance buffs
- **v9→v10**: Add resonance chain state
- **v10→v11**: Add `ProgressLog.type` and `ProgressLog.className`; scroll use now writes skill event logs
- **v11→v12**: Add per-task `QuestTodoItem[]`; completed todos store `todoId`/`todoTitle` on progress logs
- **v12→v13**: Add `FeatState`, pending feat choices, permanent owned feats, daily feat usage, and rest counters
- **v13→v14**: Add reusable `ProgressTag[]` and `ProgressLog.progressTags` snapshots

## Key Conventions

- **Inline styles for dynamic colors**: Use `style={{ color: CLASS_META[cn].hexColor }}` instead of Tailwind dynamic classes. Tailwind only scans `app/`, `components/`, `lib/` — not `data/`. Dynamic class names from `data/classes.ts` won't be generated.
- **Animation queues**: Never set animation state directly on user action; always enqueue via refs to prevent overlap.
- **Zustand for data clearing**: Use `clearAll()` action, not direct `localStorage.removeItem()` (persist middleware may rewrite on unmount).
- **Store actions are the single source of truth**: All state mutations go through Zustand actions in `quest-store.ts`.
- **Active task ordering**: `setFocusTask()` only changes `focusTaskId` and must not reorder tasks; `progressTask()` appends the progressed task to the end of `tasks` and updates `lastFocusedAt`; the quick active-task selector sorts by `createdAt` so it stays stable for finding tasks.
- **Task class mapping**: `getTaskClass(task)` determines which class a task belongs to (from `task.className`).
- **Resonance keys**: Always use `getResonanceKey(a, b)` so class pairs are order-independent.
- **WebDAV sync**: Use `/api/webdav` route handlers and `lib/server/webdav-config.ts`; do not call WebDAV directly from client components.
- **Package version**: Before desktop builds/releases, compare `package.json` `version` with the newest `CHANGELOG.md` milestone.

## Verification Checklist

- Run `npm run build` for Next.js production build checks after app/store/data changes.
- Run `npm run desktop:dir` after Electron packaging or standalone-server resource changes.
- Run `npm run desktop:build` / `npm run desktop:build:win` only when verifying release artifacts for the target platform.
- For WebDAV changes, verify `/sync`, `/api/webdav`, and config persistence behavior in both browser dev mode and packaged Electron mode when relevant.
- For persisted store changes, test migration/import with an older backup and confirm `questflow-v1` localStorage data still hydrates.
