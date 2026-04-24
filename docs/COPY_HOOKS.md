# ClawClip 传播文案钩子

这些是给 GitHub / X / 小红书 / Reddit 用的短文案。每条都是独立的，可以直接复制粘贴。

---

## 中文钩子（小红书 / 微信 / 知乎）

### 1. 痛点直击型
```
你的 Agent 在重试循环上烧了多少 token？

大部分人不知道，因为日志里看不出来。

虾片（ClawClip）会把一次运行摊开：
- 哪一步一直在重试
- 哪个模型拿钱不干活
- 这次改动到底有没有用

本地跑，读现有日志，不上传。

https://github.com/Ylsssq926/clawclip
```

### 2. 对比反差型
```
换了个模型，账单涨了 30%。

但你不知道：
- 分数有没有涨
- 涨的够不够这 30%
- 钱到底花在哪了

虾片（ClawClip）给你三个答案：
回放 → 看它做了什么
评分 → 看它撑住没
成本 → 看它值不值

https://github.com/Ylsssq926/clawclip
```

### 3. 场景代入型
```
你改了 Prompt，重跑一次，看起来好像更好了。

但你不确定：
是真的变强了，还是只是这次运气好？
成本涨了，但涨得值不值？

虾片（ClawClip）会把前后两次摆一起：
分数、token、成本，一眼看出差距。

本地跑，不上传数据。

https://github.com/Ylsssq926/clawclip
```

### 4. 一句话版（适合评论区）
```
你的 Agent 是真变强了，还是只是更贵了？虾片告诉你。
```

```
重试循环、膨胀的 Prompt、拿贵模型干轻活——虾片告诉你钱死在哪。
```

```
改完 Prompt 不知道有没有用？虾片给你前后对比：分数、token、成本。
```

---

## 英文钩子（GitHub / X / Reddit / HN）

### 1. Pain point hook
```
Your agent's burning tokens on retry loops.

Most people don't know how much — because raw logs don't make it obvious.

ClawClip breaks down each run:
- Which step kept retrying
- Which model isn't earning its cost
- Whether your last change actually helped

Runs locally. Reads your existing logs. No upload.

https://github.com/Ylsssq926/clawclip
```

### 2. Contrast hook
```
You swapped models. The bill went up 30%.

But you don't know:
- Did the score go up?
- Did it go up enough to justify 30% more?
- Where exactly did the money go?

ClawClip gives you three answers:
Replay → what it did
Scorecard → did it hold up
Cost → was it worth it

https://github.com/Ylsssq926/clawclip
```

### 3. Scenario hook
```
You tweaked the prompt. Ran it again. Looks better.

But you're not sure:
Did it actually get stronger, or just got lucky this time?
Cost went up — but was it worth it?

ClawClip puts before/after side by side:
Score, tokens, cost. The gap becomes obvious.

Runs locally. No upload.

https://github.com/Ylsssq926/clawclip
```

### 4. One-liner (for comments)
```
Did your agent get better, or just more expensive? ClawClip shows you.
```

```
Retry loops. Bloated prompts. Expensive models doing lightweight work. ClawClip shows you where.
```

```
Changed your prompt and don't know if it helped? ClawClip gives you before/after proof: score, tokens, cost.
```

---

## GitHub Issue / Discussion 回复模板

### 当别人在讨论 token cost / model selection 时
```
+1 这个方向。

我后来发现，大家最缺的往往不是"总账单"，而是 **钱到底死在哪一步**。

有些 run 看起来很忙，其实主要在三件事上白烧：
- 同一个工具失败后反复重试
- 上下文越滚越胖
- 轻任务还挂着贵模型

所以我做了个本地小工具 **ClawClip**：https://github.com/Ylsssq926/clawclip
它会直接读 OpenClaw / ZeroClaw 的 session，不只看总花费，还会把"哪一步在原地绕圈""这次改动是变强了还是只是变贵了"摊开看。

如果 OpenClaw 以后要内建 usage / cost，我会特别期待两件事：
1. 能对到单次 run，而不只是日报
2. 能证明优化前后到底有没有值回票价

光知道今天花了多少钱还不够，能顺着一条 run 指到问题点，才真的开始能省。
```

### 英文版
```
+1 on this direction.

I've found that what people really need isn't just "total spend" — it's **where exactly the money's going in each run**.

Some runs look busy but are actually burning tokens on three things:
- Retry loops after tool failures
- Context bloat
- Expensive models doing lightweight work

So I built **ClawClip**: https://github.com/Ylsssq926/clawclip
It reads OpenClaw / ZeroClaw sessions locally and shows not just total cost, but which steps are spinning in place and whether your last change made it stronger or just more expensive.

If OpenClaw adds built-in usage / cost tracking, I'd especially want:
1. Per-run breakdown, not just daily totals
2. Before/after proof that an optimization was worth it

Knowing today's total isn't enough. Being able to point at the exact step where the money's going — that's when you can actually start cutting waste.
```

---

## 使用建议

### 小红书 / 微信
- 用"痛点直击型"或"对比反差型"
- 配一张 Dashboard 或 Benchmark 截图
- 标题可以用：`你的 Agent 在哪一步白烧钱？`

### X (Twitter)
- 用"一句话版"
- 配 GIF 动图（radar-animation）
- 加 hashtag: #OpenClaw #AI #TokenOptimization

### GitHub Discussions / Issues
- 用"回复模板"
- 只在真的贴题时发，别刷存在感
- 先讲观察，再给链接

### Reddit / HN
- 用"Scenario hook"
- 标题：`Show HN: ClawClip – See where your agent's tokens are actually going`
- 第一句话要能让人停一下

---

## 核心原则

1. **先给画面，再给解决方案**
   - ❌ "ClawClip 帮你优化 token 使用"
   - ✅ "你的 Agent 在重试循环上烧了多少 token？"

2. **用人会说的话**
   - ❌ "进行前后对比分析"
   - ✅ "把前后两次摆一起"

3. **别端着**
   - ❌ "ClawClip 是一款专业的 Agent 性能分析工具"
   - ✅ "虾片告诉你钱死在哪"

4. **一句话要能让人停一下**
   - 测试标准：你会不会想接一句？
