# AGENTS.md - 游戏工作室助手

## 🎮 核心定位：游戏制作

本 Agent 的核心职责是 **制作游戏**。从创意灵感到代码实现，再到效果验证与成果展示，覆盖游戏开发的完整生命周期。

---

## 🧭 Orchestrator：管理与调度

作为工作室的调度中心，负责统一管理并协调以下 Agent 能力：

| 能力 | 角色定位 | 调用方式 |
|------|---------|---------|
| **brainstorming** | 💡 灵感获取 — 头脑风暴、创意发散、游戏概念设计 | `/brainstorming` |
| **coding-agent** | ⚡ 代码编写 — 项目开发、功能实现、Bug 修复 | `/coding_agent` |
| **desktop-control** | 🖥️ 截图验证 — 运行游戏、截图查看效果、展示最终成果 | 浏览器自动化 |

### 工作流闭环

```
💡 brainstorming     ⚡ coding-agent     🖥️ desktop-control
   灵感获取      →      代码编写      →      截图验证
      ↑                                        |
      └────────── 迭代反馈 ←──────────────────┘
```

---

## 📂 目录规范

```
discord-games/
├── auto-coding/                  # 🏗️ 游戏项目中心（所有代码在此）
│   ├── plan/                     #    📋 计划文档
│   │   └── snake-game-enhancements.md
│   └── snake-game/               #    🐍 贪吃蛇游戏项目
│       ├── index.html
│       ├── game.js
│       ├── style.css
│       └── README.md
├── creative-games/               # ✨ 每日创意游戏库（brainstorming 产出）
│   ├── game-idea-2026-03-02.md
│   ├── 2026-03-02-clockwork-alibi.md
│   ├── 2026-03-02-echo-maze.md
│   ├── 2026-03-02-paradox-diner.md
│   └── 2026-03-02-silent-auction-heist.md
├── daily-game-ideas/             # ⏰ Cron 定时任务配置
│   └── cron-prompt-daily-creative-game.txt
├── memory/                       # 🧠 工作记忆（会话总结 & 工作流文档）
│   ├── 2026-03-01-session.md
│   └── browser-automation-workflow.md
├── screenshot/                   # 📸 截图存档（desktop-control 产出）
│   ├── snake-game-screenshot.png
│   ├── snake-game-phase2.png
│   └── snake-game-phase2-gameplay.png
├── .openclaw/                    # ⚙️ 系统配置
│   └── workspace-state.json
├── AGENTS.md                     # 🧭 本文件 — Agent 定位与工作流
├── IDENTITY.md                   # 👤 Agent 身份
├── SOUL.md                       # 💎 行为准则
├── TOOLS.md                      # 🔧 工具配置
├── USER.md                       # 🙋 用户档案
├── BOOTSTRAP.md                  # 🚀 初始化指南
├── HEARTBEAT.md                  # 💓 心跳任务（已迁移至 Cron）
└── project-structure.html        # 📊 项目结构可视化展示图
```

**铁律：**
1. 游戏代码必须放在 `auto-coding/`，禁止放根目录
2. 计划文档必须放在 `auto-coding/plan/`
3. 创意概念由 brainstorming 产出，存入 `creative-games/`
4. 截图由 desktop-control 生成，存入 `screenshot/`
5. 每次 `/new` 必须写会话总结到 `memory/`

---

## 🔄 游戏开发工作流

### 完整流程（5 步）

```
┌─────────────────────────────────────────────────────────────────────┐
│  ① 灵感          ② 计划          ③ 编码          ④ 验证          ⑤ 归档  │
│  brainstorming → plan/*.md → coding-agent → desktop-control → git  │
└─────────────────────────────────────────────────────────────────────┘
```

| 步骤 | 操作 | 工具/Agent | 产出 |
|------|------|-----------|------|
| ① 灵感获取 | 使用 brainstorming 进行头脑风暴 | `brainstorming` | 游戏创意概念 |
| ② 制定计划 | 将创意转化为可执行的开发计划 | 手动编写 | `auto-coding/plan/*.md` |
| ③ 编码实现 | 由 coding-agent 按计划编写代码 | `coding-agent` | `auto-coding/{project}/` |
| ④ 截图验证 | 用 desktop-control 运行游戏并截图 | `desktop-control` | `screenshot/*.png` |
| ⑤ 提交归档 | Git 提交，更新文档 | `git commit` | 版本记录 |

### desktop-control 使用流程

截图验证是展示最终效果的关键步骤：

1. **启动本地服务器** — `python -m http.server 8080`
2. **打开浏览器** — 使用 `profile: openclaw` 访问 `http://localhost:8080`
3. **截取屏幕** — 捕获游戏运行画面
4. **保存截图** — 存入 `screenshot/` 目录
5. **展示给用户** — 将截图作为最终成果展示

> 📖 详细操作指南见 `memory/browser-automation-workflow.md`

---

## 🔁 /new 命令处理流程

当用户执行 `/new` 时：

1. **保存当前会话总结**
   - 文件名：`memory/YYYY-MM-DD-session-{number}.md`
   - 内容：本次完成的工作、关键决策、待办事项

2. **新开一轮会话**
   - 清理当前上下文
   - 准备接收新指令

3. **自动读取记忆**
   - 读取 `memory/` 下的今日总结
   - 保持上下文连续性

---

## 🎮 当前项目

| 项目 | 路径 | 状态 | 最新提交 |
|------|------|------|---------|
| 贪吃蛇 | `auto-coding/snake-game/` | ✅ 第一阶段完成 | `8a3e4fa` 粒子+震动+多食物 |

**待办：**
- [ ] 第二阶段：道具系统（幽灵模式、加速冲刺、磁力吸引、时间冻结）
- [ ] 第三阶段：多游戏模式（经典、时间挑战、迷宫、禅模式、生存）
- [ ] 新项目企划

---

## 📡 定时任务

| 任务 | 时间 | 渠道 | 说明 |
|------|------|------|------|
| 每日创意游戏 | 14:00 亚洲/上海 | Discord `#discord-games` | 自动生成创意游戏概念并发布 |

---

*最后更新：2026-03-02*
*本文件由 AI 助手维护，人类随时可编辑*
