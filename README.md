# QuestFlow

QuestFlow 是一个专为 AI 时代知识工作者设计的轻量级任务推进器。它不强调把任务勾选为完成，而是鼓励用户每天把长期任务继续往前推进一步。

它不是一个传统的 Todo List，也不是另一个复杂的项目管理工具。

在 AI Agent 逐渐成为工作伙伴的今天，越来越多的工作不再是「创建任务 → 完成任务」的线性过程，而是多个长期任务并行推进、频繁切换上下文、持续迭代优化的过程。

对于工程师、产品经理、研究员和 Agent 用户来说，真正重要的往往不是「完成了多少任务」，而是：

> 今天是否让重要的事情向前推进了一步。

QuestFlow 希望记录和奖励这种持续推进的过程。

## 核心理念

传统 Todo 软件奖励完成任务。QuestFlow 奖励推进任务。

适合这些工作流：

- Agent 实验
- 模型评测
- 技术调研
- PRD 编写
- Bug 修复
- 任何持续数天或数周的知识工作

## V1 功能

- 快速创建 Quest：输入标题后按 Enter 创建
- 任务列表：展示 Active、Paused、Archived 状态
- Focus 模式：同一时间只有一个当前专注任务
- Progress 推进：一键 `+1`，记录每一步推进
- Progress Log：保存推进时间、备注、XP 和当前进度
- XP/Level：每次推进获得 XP，里程碑有额外奖励
- Streak：当天至少推进一次即计入连续推进天数
- Momentum：同一任务连续推进时展示连击反馈
- Agent 展示：支持 Codex、Claude Code、Cursor Agent、Gemini 等展示标签
- 本地持久化：使用 `localStorage` 保存数据

## 技术栈

- Next.js 15
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- localStorage

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

生产构建：

```bash
npm run build
```

## V1 不包含

- 登录
- 云同步
- 多人协作
- 标签
- 优先级
- 截止时间
- 日历
- AI 自动规划
- Agent 自动执行
- 通知系统
- 移动端 App

## License

MIT
