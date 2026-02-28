# X Trends — 产品需求文档（PRD）

**版本：** v1.0
**日期：** 2026-02-28
**项目地址：** https://github.com/GzGod/xtrends

---

## 一、产品概述

X Trends 是一款面向中文内容创作者的推特热榜聚合与写作辅助工具。产品实时抓取 [trends.xhunt.ai](https://trends.xhunt.ai) 的热门推文数据，提供话题分类、流量分析、原文预览，并接入 AI 大模型，帮助创作者快速发现热点选题、生成符合特定风格的例文。

**目标用户：** 推特中文圈内容创作者、KOL、投研写手、加密/AI 领域博主

**部署平台：** Vercel（Next.js 14 App Router）

---

## 二、核心功能模块

### 2.1 热榜抓取（数据层）

| 项目 | 说明 |
|------|------|
| 数据来源 | trends.xhunt.ai（服务端 SSR 页面，无公开 API） |
| 抓取方式 | 服务端 fetch + cheerio 解析 HTML |
| 抓取频率 | 用户手动刷新 + 前端每 30 分钟自动刷新 |
| 数据字段 | 排名、作者名、handle、头像、AI摘要、浏览量、点赞数、转发数、热度值（0-100）、领域标签 |
| 支持参数 | `group`（cn/en/global）、`hours`（1/4/8/24）、`tag`（领域标签过滤） |
| 缓存策略 | `cache: no-store`，每次请求实时抓取 |

**API：** `GET /api/trends?group=cn&hours=4&tag=crypto`

---

### 2.2 推文列表展示

**功能点：**
- 推文卡片展示：排名序号、头像、作者名、@handle、AI摘要内容、热度进度条、浏览/点赞/转发数
- 热度进度条颜色分级：≥70 红色、≥40 橙色、<40 蓝色
- 搜索过滤：实时搜索推文内容、作者名、handle
- 排序切换：热度排名 / 浏览量 / 点赞数
- 加载骨架屏：首次加载时显示 8 条占位动画
- 空状态提示：无匹配结果时显示提示文字

---

### 2.3 原文悬浮预览

**功能点：**
- 鼠标悬停推文卡片 400ms 后，右侧弹出浮层
- 浮层通过 Twitter oEmbed API 拉取推文完整原文
- 显示加载中状态（旋转图标）
- 原文结果缓存 1 小时（`Cache-Control: public, max-age=3600`）
- 鼠标离开后浮层消失

**API：** `GET /api/tweet-preview?id={tweetId}`

**注意：** xhunt.ai 展示的内容为 AI 生成摘要，悬浮预览拉取的是 Twitter 原始全文。

---

### 2.4 侧边栏筛选

**功能点：**

| 筛选项 | 选项 |
|--------|------|
| 地区 | 中文圈（cn）/ 英文圈（en）/ 全球（global） |
| 时间范围 | 1h / 4h / 8h / 24h |
| 领域标签 | 全部 / crypto / ai / 其他 / 内容创作 / 金融 等（动态从页面解析） |
| 热门话题 | 吃瓜 / 超级个体 / vibe coding 等（动态，按热度排序，最多显示 8 个） |

- 切换地区时自动清空标签筛选
- 侧边栏顶部显示当前已抓取推文数量及最后更新时间
- 手动刷新按钮，刷新中显示旋转动画

---

### 2.5 话题流量分析

**功能点：**
- 位于推文列表上方，有领域标签数据时自动显示
- 按领域标签统计：总浏览量、总点赞数、平均热度
- 横向进度条可视化，以最高浏览量为基准归一化
- 颜色区分不同标签（蓝/紫/绿/橙/粉/青/橙）
- 当推文无标签数据时，按标签条数比例估算浏览量分布

---

### 2.6 AI 写作助手

**交互流程（两步）：**

```
第一步：获取选题
用户点击「获取选题」
→ 发送 TOP 30 热门推文摘要 + 标签数据给 AI
→ AI 返回 5-10 个选题标题（纯文字，无装饰符号）
→ 展示为可点击的选题列表

第二步：生成例文
用户点击某个选题
→ AI 按照预设写作风格提示词生成 600-1000 字例文
→ 流式输出，实时显示生成过程
→ 生成完成后显示「复制」按钮
```

**写作风格（内置 System Prompt）：**
- 语气克制理性，略带冷幽默，偏软核投研风格
- 每段 3-5 行，信息浓缩
- 禁用句式：不是…而是…、说白了…、真正的…、换句话说…、所以…、自问自答
- 结构：反差开场 → 机制原理 → 数据路径 → 含蓄收口
- 结尾附免责声明

**模型选择（前端下拉）：**

| 模型 ID | 显示名称 |
|---------|---------|
| gemini-2.5-pro | Gemini 2.5 Pro（默认） |
| gemini-3-pro-preview | Gemini 3 Pro |
| gemini-3-pro-preview-maxthinking | Gemini 3 Pro 深思 |
| gemini-3-flash-preview | Gemini 3 Flash |
| [普克]claude-sonnet-4-6 | Claude Sonnet 4.6 |
| [普克]claude-opus-4-6 | Claude Opus 4.6 |

**API：** `POST /api/writing-advice`
- `mode: "topics"` — 生成选题列表
- `mode: "article"` — 生成例文（需传 `topic` 字段）
- `model` — 可选，覆盖服务端默认模型
- 响应格式：SSE 流式输出（`text/event-stream`）

---

## 三、技术架构

```
前端（客户端）
├── Dashboard.tsx       主布局，状态管理，数据请求
├── Sidebar.tsx         筛选面板
├── TweetCard.tsx       推文卡片 + 悬浮预览
├── TopicAnalytics.tsx  话题流量分析图表
└── WritingAdvice.tsx   AI 写作助手（两步流程）

后端（Next.js API Routes）
├── /api/trends         抓取 xhunt.ai，返回推文 + 标签数据
├── /api/tweet-preview  Twitter oEmbed 原文获取
└── /api/writing-advice AI 写作建议（流式，支持 topics/article 两种模式）

数据抓取
└── lib/scraper.ts      cheerio 解析 HTML，精确 CSS 选择器
```

**技术栈：**
- Next.js 14（App Router）+ TypeScript
- Tailwind CSS（深色主题，`bg-[#0a0f1e]`）
- cheerio（服务端 HTML 解析）
- OpenAI 兼容 API（支持 Gemini / Claude，可配置）

---

## 四、环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_API_KEY` | AI 接口密钥（必填） | — |
| `AI_API_BASE` | API 端点地址 | `https://max.openai365.top/v1` |
| `AI_MODEL` | 默认模型 | `gemini-2.5-pro` |

---

## 五、已知限制

| 问题 | 说明 |
|------|------|
| 推文内容为摘要 | xhunt.ai 展示的是 AI 生成摘要，非原始推文全文 |
| 话题标签匹配 | 当前推文对象无标签字段，流量分析按条数比例估算 |
| oEmbed 限速 | Twitter oEmbed API 有频率限制，高并发下可能失败 |
| 抓取稳定性 | xhunt.ai 页面结构变更会导致解析失败，需更新选择器 |
| Vercel 函数超时 | writing-advice 设置 60s，trends 设置 30s |

---

## 六、后续迭代方向（Backlog）

- [ ] 推文标签字段补全（从 xhunt.ai 标签页抓取对应推文 ID）
- [ ] 历史数据存储（接入 Vercel KV 或 Supabase，支持趋势对比）
- [ ] 写作风格自定义（用户可编辑 System Prompt）
- [ ] 例文导出（Markdown / 纯文本）
- [ ] 移动端响应式优化
- [ ] 多语言支持（英文圈写作建议）
- [ ] 推文收藏夹（本地 localStorage）
