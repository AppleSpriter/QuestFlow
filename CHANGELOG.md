# Changelog

All notable changes to QuestFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## v1.6 - 2026-05

新增**优先级与休息系统**，让 QuestFlow 更接近管理一支 DnD 冒险队伍的体验。

### Added

- 任务标签：重要（🔵）/ 紧急（🔴），可同时选择（🟣 +5 XP）
- 职业疲劳值系统（0~100），每次推进 +5 疲劳
- 短休（5 分钟）：所有职业恢复 30% 疲劳
- 长休（15 分钟）：所有职业疲劳归零，触发今日冒险总结
- 队伍协同奖励：连续推进不同职业时 +10 XP + 卷轴加成
- Party Status 面板展示各职业 XP 和疲劳条

### Changed

- 疲劳影响奖励：>30 → 90%，>60 → 75%，>80 → 50%

### Fixed

- 数据迁移至 v7（自动处理结构变更）

## v1.5 - 2026-04

大版本更新，核心变更：**用 DnD 职业成长体系取代了伙伴抽卡系统**。

### Added

- 5 职业体系，每个职业绑定真实工作类型
- 技能检定（d20 投骰）机制
- 卷轴 → 技能线学习/升环系统（1~9 环，2^(n-1) 指数升环）
- 法术书（Spellbook）界面
- 卷轴开启动画（ScrollReveal）

### Changed

- 所有技能/检定/卷轴名称中文化

### Removed

- 水晶、伙伴抽卡、伙伴图鉴、陪伴伙伴

### Fixed

- 数据迁移至 v5（自动处理结构变更）
