import { DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { SessionReplay, SessionStep, SessionMeta } from '../types/replay.js';

function priceFor(model?: string): number {
  if (model && DEFAULT_MODEL_PRICING[model] != null) return DEFAULT_MODEL_PRICING[model];
  return 5.0;
}

function finalizeReplay(partial: { meta: Omit<SessionMeta, 'totalCost' | 'totalTokens' | 'durationMs' | 'startTime' | 'endTime' | 'modelUsed' | 'stepCount'> & Partial<SessionMeta>; steps: SessionStep[] }): SessionReplay {
  const stepsIn = partial.steps;
  const n = stepsIn.length;
  let totalCost = 0;
  let totalTokens = 0;
  const models = new Set<string>();

  const steps: SessionStep[] = stepsIn.map((s, i) => {
    const model = s.model;
    if (model) models.add(model);
    const cost = ((s.inputTokens || 0) + (s.outputTokens || 0)) * priceFor(model) / 1_000_000;
    totalCost += cost;
    totalTokens += (s.inputTokens || 0) + (s.outputTokens || 0);
    const durationMs =
      i < n - 1 ? Math.max(0, stepsIn[i + 1].timestamp.getTime() - s.timestamp.getTime()) : 0;
    return { ...s, cost, durationMs };
  });

  const startTime = steps[0]?.timestamp ?? new Date();
  const endTime = steps[n - 1]?.timestamp ?? startTime;
  const firstUser = steps.find(s => s.type === 'user');
  const summary = (firstUser?.content ?? partial.meta.summary ?? '').slice(0, 80);

  return {
    meta: {
      ...partial.meta,
      summary,
      startTime,
      endTime,
      durationMs: Math.max(0, endTime.getTime() - startTime.getTime()),
      totalCost,
      totalTokens,
      modelUsed: Array.from(models),
      stepCount: steps.length,
    },
    steps,
  };
}

/** 没装 OpenClaw 时给主人尝个鲜 — 两条完整回放样本 */
export const DEMO_SESSIONS: SessionReplay[] = [
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/xhs-grass'),
      agentName: 'demo',
      summary:
        '帮我写一篇小红书种草文案，主题是「最近入坑的 AI 自动化工具」，语气轻松、带点 emoji，不要太硬广。',
    },
    steps: [
      {
        index: 0,
        timestamp: new Date('2025-03-18T09:12:03.120Z'),
        type: 'user',
        content:
          '帮我写一篇小红书种草文案，主题是「最近入坑的 AI 自动化工具」，语气轻松、带点 emoji，不要太硬广。',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: new Date('2025-03-18T09:12:08.950Z'),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '用户要小红书风格：标题要吸睛、正文分点、结尾引导互动。先搜一下近期热门的 AI 自动化工具名，避免文案里全是陈词滥调；语气要「姐妹安利」而不是说明书。',
        inputTokens: 420,
        outputTokens: 180,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: new Date('2025-03-18T09:12:14.200Z'),
        type: 'tool_call',
        model: 'deepseek-chat',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({
          query: '2025 小众但好用的 AI 自动化工具 中文 小红书 风格',
          max_results: 5,
        }),
        inputTokens: 610,
        outputTokens: 90,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: new Date('2025-03-18T09:12:19.640Z'),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          snippets: [
            { title: 'n8n 工作流：把日报和表格联动', url: 'https://example.com/n8n-tip' },
            { title: 'Raycast + AI：秒开指令面板', url: 'https://example.com/raycast' },
            { title: 'ClawClip / OpenClaw：会话回放看钱花哪了', url: 'https://example.com/clawclip' },
          ],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: new Date('2025-03-18T09:12:26.010Z'),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '检索结果里 n8n、Raycast、会话回放类工具都有话题度。正文里穿插「早上咖啡还没凉就搞定」这种场景句；避免堆砌英文缩写，必要时括号中文解释一下。',
        inputTokens: 880,
        outputTokens: 240,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: new Date('2025-03-18T09:13:41.880Z'),
        type: 'response',
        model: 'deepseek-chat',
        content: `标题：谁懂啊🥹 这仨 AI 自动化把我从「复制粘贴地狱」捞出来了

姐妹们下午好！最近真的被重复劳动磨没脾气了，试了一圈工具，留下三个愿意长期养在电脑里的👇

✨ n8n：我把「飞书表格 + 日报提醒」串成一条流，早上到公司咖啡还没凉，摘要已经在群里了。免费自托管够玩，节点拖一拖就能看懂。

✨ Raycast（加 AI 插件）：别再把时间花在「找那个 App」上，呼出面板一句话：总结 PDF、起邮件、顺手翻译，键盘党狂喜。

✨ 会话回放向的工具（比如 ClawClip）：跑 Agent 最怕钱烧哪不知道，把每次模型调用摊开来，心里才有底——本抠门博主实名需要。

结尾互动：你们还有啥「装上就回不去」的自动化？评论区互相抄作业！💅`,
        inputTokens: 1120,
        outputTokens: 410,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/python-perf'),
      agentName: 'demo',
      summary:
        '下面这段 Python 在列表很大的时候特别慢，帮我看看瓶颈在哪，顺便给一版改法（不用改我本地文件）。',
    },
    steps: (() => {
      const userMsg =
        '下面这段 Python 在列表很大的时候特别慢，帮我看看瓶颈在哪，顺便给一版改法（不用改我本地文件）。';
      const codeSnippet = `def find_duplicates(items):
    result = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j] and items[i] not in result:
                result.append(items[i])
    return result`;
      return [
        {
          index: 0,
          timestamp: new Date('2025-03-19T14:22:10.000Z'),
          type: 'user' as const,
          content: `${userMsg}\n\n\`\`\`python\n${codeSnippet}\n\`\`\``,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 1,
          timestamp: new Date('2025-03-19T14:22:13.800Z'),
          type: 'thinking' as const,
          model: 'gpt-4o-mini',
          content:
            '双重循环比较所有对，复杂度约 O(n²)；`items[i] not in result` 里 `in` 对 list 又是线性扫描，整体很容易炸。先确认用户只要分析不要写文件，回复里给 Counter 或 set 思路即可。',
          inputTokens: 520,
          outputTokens: 140,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 2,
          timestamp: new Date('2025-03-19T14:22:18.200Z'),
          type: 'tool_call' as const,
          model: 'gpt-4o-mini',
          content: '',
          toolName: 'read_file',
          toolInput: JSON.stringify({ path: '/tmp/snippets/dup_demo.py', offset: 0, limit: 120 }),
          inputTokens: 680,
          outputTokens: 72,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 3,
          timestamp: new Date('2025-03-19T14:22:21.050Z'),
          type: 'tool_result' as const,
          content: '',
          toolOutput: codeSnippet,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 4,
          timestamp: new Date('2025-03-19T14:23:55.400Z'),
          type: 'response' as const,
          model: 'gpt-4o-mini',
          content: `这段的核心问题是 **O(n²) 的双重循环** 叠加上 **\`not in result\` 对 list 的 O(k) 扫描**，数据一大就会明显感觉「卡死」。

**瓶颈在哪**
- 外层 i、内层 j 会重复比较大量已经不可能的新组合。
- \`result\` 用 list 时，\`x not in result\` 每次都从头扫，重复惩罚叠加。

**改法一（保持「首次出现」语义）**：用集合记录已经见过的元素，第二遍只 O(1) 判断。

\`\`\`python
def find_duplicates(items):
    seen = set()
    dup = set()
    for x in items:
        if x in seen:
            dup.add(x)
        else:
            seen.add(x)
    return list(dup)
\`\`\`

**改法二**：如果只要「出现次数 > 1」的值，用 \`collections.Counter\` 一行统计再筛，可读性最好。

如果你其实需要保序输出第一次重复的先后顺序，再说一下业务规则，我可以把版本收紧到完全等价。`,
          inputTokens: 980,
          outputTokens: 360,
          cost: 0,
          durationMs: 0,
        },
      ];
    })(),
  }),
];
