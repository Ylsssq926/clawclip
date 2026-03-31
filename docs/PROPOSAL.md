# ClawClip 品牌升级 & 产品进化方案

> 汇总日期：2026-03-30
> 状态：待评估
> 说明：本文件包含所有改进建议，不直接修改项目代码

---

## 一、核心定位升级

### 1.1 新 Slogan（备选）

| 版本 | 文案 | 风格 |
|------|------|------|
| **A（直接型）** | 你的 AI Agent，今天表现怎么样？——让数据回答。 | 亲切直接 |
| **B（数据型）** | AI Agent 的能力成绩单 + 成本账单 | 平衡专业与亲切 |
| **C（对比型）** | 你的 Agent 比别人的强吗？ ClawClip 告诉你 | 挑战感 |
| **D（情感型）** | 每天跑那么多 Agent，你知道它们到底在干嘛吗？ | 故事感 |

**推荐：B**（平衡品牌调性和专业感）

---

### 1.2 核心叙事重构

**当前：**
> 虾片 (ClawClip) 把无聊的 Agent 日志变成好看的时间轴回放，给你的龙虾做六维体检打分，顺便看看钱都花哪了。

**新版本（推荐）：**
> ClawClip 是 AI Agent 的「能力成绩单」和「成本账单」。
>
> 不只是回放日志——而是告诉你：你的 Agent 在写作、编程、工具使用、检索、安全、成本控制六个维度上，到底打几分？花了多少钱？比上次进步了吗？
>
> 100% 本地运行，数据永不外传。

---

### 1.3 功能重命名（技术词 → 用户语言）

| 原名称 | 新名称（中文） | 新名称（英文） | 理由 |
|--------|----------------|----------------|------|
| Session Replay | **运行洞察** | Run Insights | "回放"像录像，"洞察"像分析报告 |
| 6D Benchmark | **Agent 成绩单** | Agent Scorecard | 雷达图=成绩单，直观 |
| Cost Monitor | **成本账单** | Cost Report | 账单比监控更亲切 |
| Smart Savings | **省钱顾问** | AI Cost Advisor | 顾问比省钱更有价值感 |
| Prompt Insight | **Prompt 效率分析** | Prompt Efficiency | 更直白 |
| Multi-Agent Compare | **Agent 对比赛** | Agent Arena | 有竞技感 |
| Alert Webhook | **预算警报** | Budget Alerts | 简单直接 |

---

## 二、Landing Page 改版方案

### 2.1 首页第一屏（新版本）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    🍤 ClawClip                                              │
│                                                             │
│    你的 AI Agent，今天表现怎么样？                            │
│    ——让数据回答。                                            │
│                                                             │
│    [副标题]                                                  │
│    OpenClaw / ZeroClaw 及所有兼容 Agent 框架的               │
│    能力评测报告 + 成本账单                                    │
│                                                             │
│    ✓ 100% 本地运行，数据永不外传                              │
│    ✓ 离线跑分，零 API 成本                                   │
│    ✓ 6 维雷达图，Agent 能力一目了然                          │
│                                                             │
│    [  🚀 体验 Demo  ]    [ ★ Star on GitHub ]              │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│    [雷达图动画：展示一个 6 维分数从 35 分展开到 82 分]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Features 区块重新排序

| 优先级 | 功能 | 新描述 |
|--------|------|--------|
| 🥇 | **Agent 成绩单（6D Benchmark）** | 六维雷达图，写作/编程/工具/检索/安全/性价比全面打分 |
| 🥈 | **成本账单（Cost Report）** | 逐日趋势、模型对比、预算警报，告诉你钱花哪了 |
| 🥉 | **运行洞察（Run Insights）** | 每一步思考、工具调用、结果，全程可视化追踪 |
| 4 | **省钱顾问（AI Cost Advisor）** | 基于历史消费，智能推荐更划算的模型组合 |
| 5 | **Agent 对比赛（Agent Arena）** | 选 2-5 个 Agent 同台竞技，哪个更强一览无余 |
| 6 | **Prompt 效率分析** | 跨会话分析 Prompt 投入产出比，找出低效会话 |
| 7 | **词云 & 知识库** | 自动提取关键词，构建你的 Agent 记忆库 |
| 8 | **排行榜 & 模板市场** | 与全网用户对比，共享优秀场景模板 |

---

## 三、吉祥物升级思路

**不改名字"虾片"，但升级视觉形象：**

| 现状 | 建议升级方向 |
|------|--------------|
| 纯文字 🍤 | 小虾戴「数据眼镜」👓，手拿雷达图 |
| 静态 | 播放动画：虾拿着望远镜观察雷达图 |
| 无场景 | 融入首页：虾在雷达图背后探出头 |
| 无情绪 | 多种状态：得意（S级）、思考（B级）、震惊（成本爆表） |

**升级后的形象定位：**
> 科技感 + 有趣 + 数据专家
> 不是卖萌的宠物，而是 Agent 世界的「数据裁判」

---

## 四、路线图（四大方向）

### 4.1 整合路线图

| 方向 | 定位 | 核心功能 | 里程碑 |
|------|------|----------|--------|
| **工具化** | Agent 开发者的 Xcode Instruments | VS Code 插件、CLI 增强、GitHub Action | v1.0 |
| **平台化** | 团队协作平台 | 团队仪表盘、A/B 测试、趋势告警 | v1.5 |
| **社区化** | Agent 的 App Store | 模板市场、模板评分、一键克隆 | v2.0 |
| **开源标杆** | 顶级开源精品 | 品牌国际化、捐赠/赞助体系、GitHub Star 10k+ | 持续 |

### 4.2 分阶段执行路线图

```
当前 v0.1.0
  │
  ├─► v1.0 工具化里程碑（3个月内）
  │     ├─ VS Code 插件
  │     ├─ CLI 增强（clawclip benchmark --since=7d）
  │     ├─ GitHub Action 集成
  │     └─ 雷达图动画 GIF + 新 Landing 上线
  │
  ├─► v1.5 平台化里程碑（6个月内）
  │     ├─ 团队仪表盘
  │     ├─ 趋势告警 + Webhook 增强
  │     └─ A/B Prompt 测试框架
  │
  ├─► v2.0 社区化里程碑（12个月内）
  │     ├─ 模板市场 + 评分系统
  │     ├─ 模板付费分成（可选）
  │     └─ 用户上传/分享体系
  │
  └─► 开源标杆（持续）
        ├─ 国际化品牌（英文官网、独立域名）
        ├─ GitHub Star 10k+
        ├─ Open Collective / GitHub Sponsors
        └─ 年度开源报告（运营数据透明化）
```

---

## 五、白嫖 Token 资源汇总

### 5.1 免费 API 资源

| 类型 | 来源 | 说明 | 地址 |
|------|------|------|------|
| **海外免费 API** | Groq | 免费 tier，Llama 3 很快 | console.groq.com |
| | together.ai | 免费 credits | together.ai |
| | Perplexity | 免费 API 有限制 | perplexity.ai |
| | OpenRouter | 部分模型免费 | openrouter.ai |
| | Cloudflare Workers AI | 免费 tier | developers.cloudflare.com |
| | Replicate | 部分模型免费 | replicate.com |
| | Hugging Face | Inference Endpoints 免费 | huggingface.co |
| | AWS Bedrock | 新用户免费 tier | aws.amazon.com/bedrock |
| | NVIDIA NIM | 免费模型推理 | build.nvidia.com |
| **国内免费** | 硅基流动 | 注册送 token | siliconflow.cn |
| | 火山引擎 | 新用户有免费额度 | volcengine.com |
| | 讯飞星火 | 有免费 tier | xfyun.cn |
| | 百度文心 | 有免费 token | cloud.baidu.com |
| | 阿里通义 | 有试用额度 | tongyi.aliyun.com |
| | 腾讯混元 | 新用户有免费额度 | cloud.tencent.com/hunyuan |

### 5.2 开源免费项目

| 类型 | 来源 | 说明 | 地址 |
|------|------|------|------|
| **本地大模型** | Ollama | 本地跑 LLM，完全免费 | ollama.com |
| | LM Studio | 桌面应用，GPU 加速 | lmstudio.ai |
| | LocalAI | 自托管 API | localai.io |
| | text-generation-webui | Web UI for LLMs | github.com/oobabooga/text-generation-webui |
| | Jan | 本地 ChatGPT 替代 | jan.ai |
| **零成本方案** | OpenClaw Zero Token | OpenClaw 分支，通过浏览器自动化复用网页版免费模型（DeepSeek/千问/Kimi/豆包等）| openclaw.dev/zero-token |
| | FreeLLM | 聚合免费 API | (待补充) |
| **开发者计划** | GitHub Education | 学生免费 credits | education.github.com |
| | Microsoft Azure | 学生订阅免费额度 | azure.microsoft.com/free/students |
| **免费模型（直接用）** | NVIDIA Nemotron Nano | OpenRouter 上免费调用，128k context | openrouter.ai/nvidia |
| | Google Gemini | 免费 tier，较大额度 | aistudio.google.com |
| | DeepSeek | API 有免费额度 | platform.deepseek.com |

### 5.3 ClawClip 集成思路

把这些资源做成 ClawClip 内部的 **"Token 资源中心"**：

```
┌─────────────────────────────────────────────────────────────┐
│  🆓 免费 Token 资源库                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [国内区]          [海外区]           [开源区]                 │
│                                                             │
│  硅基流动 →       Groq →           Ollama                   │
│  火山引擎         together.ai       LM Studio               │
│  讯飞星火         OpenRouter        LocalAI                  │
│  百度文心         Cloudflare         Jan                     │
│  阿里通义         NVIDIA NIM        text-generation-webui   │
│  腾讯混元         Hugging Face                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [推荐组合]                                                  │
│  国内：硅基流动 + 火山引擎（免费额度大）                       │
│  海外：Groq + Cloudflare（速度快，延迟低）                     │
│  本地：Ollama + LM Studio（完全免费，隐私无忧）                │
│                                                             │
│  [一键复制配置]    [查看官方文档]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**功能点：**
1. 分类展示所有白嫖渠道（国内/海外/开源）
2. 点击复制 API 配置示例
3. 链接跳转到官网注册
4. 标注每个渠道的免费额度
5. **推荐最优组合**（比如：国内用硅基+火山，海外用 Groq）
6. 显示实时可用状态（可选）

---

## 六、GIF 生成脚本

### 6.1 文件位置
`scripts/generate-radar-gif.mjs`

### 6.2 运行方式
```bash
npm run gif
```

### 6.3 依赖
- `canvas` - Node.js 图形库
- `gifenc` - 纯 JS GIF 编码器

### 6.4 生成效果
- 60 帧雷达图动画
- 从 35 分"展开"到 82 分
- 带品牌 logo 和标题
- 输出到 `docs/radar-animation.gif`

---

## 七、快速执行清单

如果你想马上开始，以下是最快能看到效果的 3 件事：

| 行动 | 预计耗时 | 效果 |
|------|----------|------|
| 1. 改 README 第一段叙事 | 10 分钟 | 转化率提升 |
| 2. 功能重命名（前端 i18n） | 1 小时 | 用户秒懂 |
| 3. 跑 GIF 脚本生成动画 | 5 分钟 | 传播力暴涨 |

---

## 八、待补充信息

- [ ] ZeroToken 项目具体信息（地址、用法）
- [ ] 其他免费 API 资源补充
- [ ] 各平台的免费额度具体数值
- [ ] Token 资源中心的优先级排序

---

*最后更新：2026-03-30*
