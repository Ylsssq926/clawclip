import { computeCost, DEFAULT_DETAILED_PRICING } from './pricing-utils.js';
import type { SessionReplay, SessionStep, SessionMeta } from '../types/replay.js';

function finalizeReplay(partial: { meta: Omit<SessionMeta, 'totalCost' | 'totalTokens' | 'durationMs' | 'startTime' | 'endTime' | 'modelUsed' | 'stepCount'> & Partial<SessionMeta>; steps: SessionStep[] }): SessionReplay {
  const stepsIn = partial.steps;
  const n = stepsIn.length;
  let totalCost = 0;
  let totalTokens = 0;
  const models = new Set<string>();

  const steps: SessionStep[] = stepsIn.map((s, i) => {
    const model = s.model;
    if (model) models.add(model);
    const cost = computeCost(DEFAULT_DETAILED_PRICING, model, s.inputTokens || 0, s.outputTokens || 0);
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
      dataSource: partial.meta.dataSource ?? 'demo',
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

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_NOW = Date.now();
const DEMO_BASE_TS = {
  smartWriter: DEMO_NOW - 2.25 * DAY_MS,
  codeHelper: DEMO_NOW - 4.5 * DAY_MS,
  analyst: DEMO_NOW - 7.5 * DAY_MS,
  dataHelper: DEMO_NOW - 10.5 * DAY_MS,
  translator: DEMO_NOW - 14 * DAY_MS,
  debugger: DEMO_NOW - 18 * DAY_MS,
  newsBot: DEMO_NOW - 24 * DAY_MS,
  emailHelper: DEMO_NOW - 29.75 * DAY_MS,
} as const;

function demoTime(baseMs: number, offsetMs = 0): Date {
  return new Date(baseMs + offsetMs);
}

function demoIso(baseMs: number, offsetMs = 0): string {
  return demoTime(baseMs, offsetMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const INVENTORY_UPDATED_AT = {
  a100: demoIso(DEMO_BASE_TS.dataHelper, -5 * DAY_MS),
  b220: demoIso(DEMO_BASE_TS.dataHelper, -6 * DAY_MS + 5 * 60 * 60 * 1000),
  c009: demoIso(DEMO_BASE_TS.dataHelper, -7 * DAY_MS + 90 * 60 * 1000),
} as const;

/** 没装 OpenClaw 时的完整回放样本：8 条场景化 Demo */
export const DEMO_SESSIONS: SessionReplay[] = [
  /* 1 — 小红书种草（smart-writer / deepseek-chat）总时长约 98s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/smart-writer'),
      agentName: 'smart-writer',
      summary:
        '帮我写一篇小红书种草文案，主题是「最近入坑的 AI 自动化工具」，语气轻松、带点 emoji，不要太硬广。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 0),
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
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 5_200),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '用户要小红书爆款结构：封面感标题、分点正文、结尾互动。先搜 2026 年热门 AI 自动化工具，避免文案过时；再搜小红书爆款写法，对齐平台语感。',
        inputTokens: 380,
        outputTokens: 165,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 12_400),
        type: 'tool_call',
        model: 'deepseek-chat',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({
          query: '2026 AI 自动化工具热门推荐',
          max_results: 8,
          language: 'zh',
        }),
        inputTokens: 560,
        outputTokens: 85,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 22_800),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          summary:
            '2026 年讨论度较高的方向包括：可视化工作流（n8n、Make）、桌面快捷 AI（Raycast/Alfred 插件）、RPA 与浏览器自动化（Playwright + Agent）、以及面向开发者的 CLI/IDE 内嵌模型。企业侧关注「合规审计 + 会话可追溯」的 Agent 运维工具。',
          sources: [
            { title: 'n8n 社区：年度自动化模板精选', url: 'https://example.com/n8n-2026' },
            { title: 'Raycast AI 扩展生态盘点', url: 'https://example.com/raycast-ai' },
            { title: 'OpenClaw 系工具：会话回放与成本分析', url: 'https://example.com/agent-replay' },
          ],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 35_100),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '根据搜索结果，把 n8n、Raycast、可追溯会话类工具放进正文，用「早八人」「抄作业」这类语感；第二只搜小红书文案结构，把标题公式和标签策略嵌进去。',
        inputTokens: 920,
        outputTokens: 210,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 48_600),
        type: 'tool_call',
        model: 'deepseek-chat',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({
          query: '小红书爆款文案写法 标题 标签 2026',
          max_results: 6,
        }),
        inputTokens: 1150,
        outputTokens: 72,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 6,
        timestamp: demoTime(DEMO_BASE_TS.smartWriter, 98_000),
        type: 'response',
        model: 'deepseek-chat',
        content: `标题：2026 入坑不亏🌿 这三类 AI 自动化把我从「重复劳动」里捞出来了

姐妹们好呀～最近真的被各种「复制粘贴 + 来回切窗口」搞到心累，试了一圈工具以后，留下几类愿意长期养在电脑里的 AI 自动化方向，纯分享不硬广💅

✨ **可视化工作流（比如 n8n 这类）**  
把「表格变更 → 飞书通知 → 日报摘要」串成一条流，早上咖啡还没凉，该谁知道的已经自动同步了。2026 年社区模板特别多，拖节点比写脚本友好太多，适合想偷懒又不想完全黑盒的姐妹。

✨ **桌面级 AI 快捷栏（Raycast / 同类）**  
一句话呼出：翻译、起邮件、总结 PDF、顺手搜内部文档……键盘党狂喜，省掉「找 App → 点开 → 再点三级菜单」的全套仪式感。

✨ **带会话回放 / 成本可视的 Agent 工具**  
跑模型最怕钱烧哪不知道、哪一步跑偏了也不知道。把每次调用摊开来看，心里才有底——本抠门博主实名需要这种「看得见的自动化」。

**怎么写才像小红书爆款？**  
我按搜到的结构做了：数字/情绪词进标题，正文用短句 + 分点 emoji，结尾抛一个问题拉互动。

**标签建议**  
#AI工具 #效率神器 #打工人必备 #自动化工作流 #2026数码好物 #种草日记

评论区聊聊：你今年「装上就回不去」的自动化是哪一款？我抄作业！🙌`,
        inputTokens: 1380,
        outputTokens: 520,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 2 — Python 性能（code-helper / gpt-4o-mini）总时长约 105s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/code-helper'),
      agentName: 'code-helper',
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
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 0),
          type: 'user' as const,
          content: `${userMsg}\n\n\`\`\`python\n${codeSnippet}\n\`\`\``,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 1,
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 4_500),
          type: 'thinking' as const,
          model: 'gpt-4o-mini',
          content:
            '双重循环是 O(n²)；`items[i] not in result` 在 list 上线性扫描，重复项多时惩罚叠加。用户只要分析与改写，不落地写文件；先 read_file 确认是否和本地一致再总结三个瓶颈点。',
          inputTokens: 480,
          outputTokens: 128,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 2,
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 11_200),
          type: 'tool_call' as const,
          model: 'gpt-4o-mini',
          content: '',
          toolName: 'read_file',
          toolInput: JSON.stringify({ path: 'proj/snippets/dup_demo.py', offset: 0, limit: 80 }),
          inputTokens: 620,
          outputTokens: 68,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 3,
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 15_800),
          type: 'tool_result' as const,
          content: '',
          toolOutput: `"""duplicate finder — user paste mirror"""\n${codeSnippet}`,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 4,
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 28_000),
          type: 'thinking' as const,
          model: 'gpt-4o-mini',
          content:
            '文件与粘贴一致。归纳 3 个性能瓶颈：① 全对比较的双重循环；② `not in result` 的 O(k) list 扫描；③ 在找到重复后仍继续内层循环的无效工作。回复里给 Counter 与双集合两种改法，并注明时空复杂度。',
          inputTokens: 900,
          outputTokens: 195,
          cost: 0,
          durationMs: 0,
        },
        {
          index: 5,
          timestamp: demoTime(DEMO_BASE_TS.codeHelper, 68_000),
          type: 'response' as const,
          model: 'gpt-4o-mini',
          content: `这段代码在大列表上慢，主要来自 **三类性能瓶颈**：

**1）O(n²) 的双重循环**  
对所有 \`(i, j)\` 对做比较，元素量上来后比较次数爆炸式增长。

**2）\`items[i] not in result\` 的隐藏线性成本**  
\`result\` 是 list 时，\`in\` 需要从头扫描，重复调用时相当于再叠一层 O(k)。

**3）找到重复后仍继续扫完内层**  
即使已经确认 \`items[i]\` 是重复，内层 \`j\` 仍会继续跑完，浪费 CPU。

---

**优化版（保序输出「首次判定为重复」的值，常用写法）**

\`\`\`python
from collections import Counter


def find_duplicates(items):
    count = Counter(items)
    seen = set()
    out = []
    for x in items:
        if count[x] > 1 and x not in seen:
            seen.add(x)
            out.append(x)
    return out
\`\`\`

**若只关心「出现过至少两次」的集合，不关心顺序**：

\`\`\`python
def find_duplicates_set(items):
    seen, dup = set(), set()
    for x in items:
        if x in seen:
            dup.add(x)
        else:
            seen.add(x)
    return list(dup)
\`\`\`

上面第二种平均 **O(n)** 时间、**O(n)** 额外空间。若你需要与原版完全一致的「第一次两两相等即收录」语义，告诉我业务规则，我可以把版本收紧到逐行等价。`,
          inputTokens: 1120,
          outputTokens: 390,
          cost: 0,
          durationMs: 0,
        },

      ];
    })(),
  }),

  /* 3 — 竞品分析（analyst / gpt-4o）总时长约 180s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/analyst'),
      agentName: 'analyst',
      summary: '帮我分析 Notion、Obsidian、Logseq 这三个笔记工具的竞品对比，要表格和结论。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 0),
        type: 'user',
        content:
          '帮我分析 Notion、Obsidian、Logseq 这三个笔记工具的竞品对比，要表格、结论和选型建议，面向个人知识管理 + 小团队协作用途。',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 8_000),
        type: 'thinking',
        model: 'gpt-4o',
        content:
          '需要从协作模型、数据主权、图谱/大纲、移动端、定价与生态插件对比。先广搜三件套对比，再补一条市场份额/趋势，合并成结构化表格与建议。',
        inputTokens: 520,
        outputTokens: 155,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 22_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({
          query: 'Notion vs Obsidian vs Logseq 2026 comparison PKM',
          region: 'global',
        }),
        inputTokens: 700,
        outputTokens: 88,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 45_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          highlights: [
            'Notion：全栈工作区，数据库与权限成熟，适合团队；本地优先弱，离线能力有限。',
            'Obsidian：Markdown 本地优先，插件极丰富，图谱视图强；协作依赖第三方或 Git。',
            'Logseq：大纲 + 双链 + 块引用，适合日记与碎片化捕捉；移动端体验因平台而异。',
          ],
          citations: ['https://example.com/pkm-survey-2026', 'https://example.com/notion-obsidian-thread'],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 58_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ query: '笔记工具市场份额 2026 Notion Obsidian', max_results: 5 }),
        inputTokens: 980,
        outputTokens: 76,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 78_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          note: '公开精确份额较少，趋势性描述为主。',
          points: [
            'Notion 在企业/wiki/项目看板场景渗透率高，付费席位增长稳定。',
            'Obsidian 在开发者与研究者群体中声量高，社区插件贡献活跃。',
            'Logseq 在「每日笔记 + 大纲」细分用户忠诚度高，开源社区驱动迭代。',
          ],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 6,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 102_000),
        type: 'thinking',
        model: 'gpt-4o',
        content:
          '综合两次检索：协作与权限选 Notion；数据在本地、可编程笔记选 Obsidian；大纲流、日记与块级双链选 Logseq。表格里对齐定价维度、离线、协作、学习曲线。',
        inputTokens: 1350,
        outputTokens: 220,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 7,
        timestamp: demoTime(DEMO_BASE_TS.analyst, 180_000),
        type: 'response',
        model: 'gpt-4o',
        content: `## Notion / Obsidian / Logseq 竞品对比（个人 PKM + 小团队）

### 对比表

| 维度 | Notion | Obsidian | Logseq |
|------|--------|----------|--------|
| 核心范式 | 页面 + 数据库 + 看板 | 本地 Markdown 文件夹 + 图谱 | 大纲日记 + 块引用 + 双链 |
| 数据归属 | 云端为主，可导出 | 本地优先，可选同步方案 | 本地为主，支持多种同步 |
| 协作 | 强：权限、评论、数据库视图 | 弱：需插件/Git/付费服务 | 中等：部分协作能力依赖工作流 |
| 离线 | 有限 | 强 | 较强（视端） |
| 移动端 | 成熟 | 可用，体验因工作流而异 | 因平台差异需注意 |
| 学习曲线 | 中（功能多） | 中（概念简单、插件深） | 中高（大纲习惯） |
| 典型人群 | 产品/运营/小团队知识库 | 开发者、研究者、重度写作者 | 日记、卡片笔记、研究笔记 |

### 结论

- **要强协作、项目与数据库一体**：优先 **Notion**。  
- **要数据在自己硬盘、可脚本化、图谱复盘**：优先 **Obsidian**。  
- **要大纲式捕捉、每日笔记与块级双链**：优先 **Logseq**。

### 选型建议

小团队若已用 Slack/飞书，可把 **Notion** 当对外/wiki；个人深度思考库用 **Obsidian** 存源文件；若个人习惯「先碎碎念再整理」，试 **Logseq** 作为入口，再定期把沉淀迁到 Obsidian 亦可。

以上为基于检索摘要的归纳，正式采购前建议各开试用空间做两周真实笔记流压测。`,
        inputTokens: 1600,
        outputTokens: 680,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 4 — JSON → CSV（data-helper / deepseek-chat）总时长约 45s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/data-helper'),
      agentName: 'data-helper',
      summary: '把这个 JSON 数据整理成 Excel 能打开的表格，字段别丢。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.dataHelper, 0),
        type: 'user',
        content: `帮我把下面 JSON 整理成可以用 Excel 打开的表格，列名用英文 snake_case，日期保持 ISO 字符串即可。

\`\`\`json
[
  {"sku": "A-100", "name": "机械键盘", "qty": 12, "unit_price": 399.0, "updated_at": "${INVENTORY_UPDATED_AT.a100}"},
  {"sku": "B-220", "name": "显示器支架", "qty": 4, "unit_price": 159.5, "updated_at": "${INVENTORY_UPDATED_AT.b220}"},
  {"sku": "C-009", "name": "USB-C 集线器", "qty": 30, "unit_price": 89.0, "updated_at": "${INVENTORY_UPDATED_AT.c009}"}
]
\`\`\``,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.dataHelper, 6_000),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '三条记录、五列字段，直接扁平化为 CSV：表头 sku,name,qty,unit_price,updated_at；数值不加千分位，避免 Excel locale 问题；用 UTF-8 BOM 方便中文环境双击打开。',
        inputTokens: 320,
        outputTokens: 95,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.dataHelper, 14_000),
        type: 'tool_call',
        model: 'deepseek-chat',
        content: '',
        toolName: 'write_file',
        toolInput: JSON.stringify({
          path: 'exports/inventory_from_json.csv',
          content:
            `sku,name,qty,unit_price,updated_at\nA-100,机械键盘,12,399.0,${INVENTORY_UPDATED_AT.a100}\nB-220,显示器支架,4,159.5,${INVENTORY_UPDATED_AT.b220}\nC-009,USB-C 集线器,30,89.0,${INVENTORY_UPDATED_AT.c009}\n`,
          encoding: 'utf-8',
        }),
        inputTokens: 480,
        outputTokens: 180,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.dataHelper, 28_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          ok: true,
          bytes_written: 312,
          path: 'exports/inventory_from_json.csv',
          message: '文件已写入，可在工作区下载或用 Excel 打开。',
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.dataHelper, 45_000),
        type: 'response',
        model: 'deepseek-chat',
        content: `已将 JSON 数组整理为 **CSV**（路径 \`exports/inventory_from_json.csv\`），表头为 \`sku,name,qty,unit_price,updated_at\`，与源字段一一对应，没有丢弃列。

**你怎么用**  
- Windows：可直接用 Excel 打开；若中文乱码，用「数据 → 自文本/CSV」并选 UTF-8。  
- 若你更希望 \`.xlsx\`，可以在 Excel 里另存为 xlsx，或告诉我是否要我再调用一步生成真正的 Excel 二进制（当前仓库演示环境以 CSV 为主）。

**数据校验**  
共 3 行库存记录，\`qty\` 与 \`unit_price\` 保持数值类型写入；时间戳保留 **ISO 8601** 字符串，便于后续在表格里做筛选排序。

若还要加一列 \`line_total = qty * unit_price\`，说一声我可以追加第二版导出。`,
        inputTokens: 720,
        outputTokens: 260,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 5 — 技术文档翻译（translator / deepseek-chat）总时长约 32s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/translator'),
      agentName: 'translator',
      summary: '帮我把下面这段英文 Kubernetes 文档翻译成专业中文，术语保留业界通行译法或括号附英文。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.translator, 0),
        type: 'user',
        content: `Please translate the following technical documentation into natural, professional Chinese. Keep terms like Pod, kube-scheduler, and affinity as commonly used in the Chinese cloud-native community (you may keep English in parentheses where helpful).

---
The Kubernetes scheduler assigns Pods to Nodes based on resource requests, limits, and scheduling constraints. When a Pod is created and not yet bound to a node, it enters the scheduling queue. The default scheduler evaluates filtering predicates (e.g., node selectors, taints and tolerations, resource availability) and then ranks feasible nodes using priority functions. Pod affinity and anti-affinity rules allow workloads to be co-located or spread across failure domains. If no node satisfies the constraints, the Pod remains Pending until the cluster state changes or the Pod specification is updated.`,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.translator, 7_000),
        type: 'thinking',
        model: 'deepseek-chat',
        content:
          '这是一段关于 Kubernetes Pod 调度流程的说明：默认调度器、过滤谓词、优先级打分、亲和性/反亲和性、Pending 状态。翻译时保留 Pod、Node、kube-scheduler、taints/tolerations 等术语习惯。',
        inputTokens: 410,
        outputTokens: 125,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.translator, 32_000),
        type: 'response',
        model: 'deepseek-chat',
        content: `Kubernetes 调度器（kube-scheduler）会根据 **资源请求（requests）**、**资源上限（limits）** 以及 **调度约束** 将 **Pod** 分配到 **Node（节点）** 上。

当一个 Pod 被创建但尚未绑定到节点时，它会进入 **调度队列**。默认调度器会先执行 **过滤谓词（filtering predicates）** 评估——例如 **node selector（节点选择器）**、**taints 与 tolerations（污点和容忍）**、**资源可用性** 等——随后在仍可行的节点上使用 **优先级函数（priority functions）** 进行排序。

**Pod 亲和性（affinity）与反亲和性（anti-affinity）** 规则用于让工作负载在拓扑上 **聚拢（co-located）** 或 **分散（spread）** 到不同故障域，以提高可用性或局部性。

如果没有任何节点满足约束条件，该 Pod 会保持 **Pending（挂起）** 状态，直到集群状态发生变化或 **Pod 规约（Pod specification）** 被更新为止。`,
        inputTokens: 680,
        outputTokens: 310,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.translator, 33_500),
        type: 'system',
        content: '会话完成：翻译已输出，未检测到进一步追问。',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.translator, 45_000),
        type: 'tool_call',
        model: 'deepseek-chat',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ query: 'neural architecture 中文专业术语翻译 云原生 AI 领域', max_results: 5 }),
        inputTokens: 720,
        outputTokens: 65,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: demoTime(DEMO_BASE_TS.translator, 58_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          terms: [
            { en: 'neural architecture', zh_options: ['神经网络架构', '神经架构'], recommended: '神经网络架构', note: '学术论文与工程文档中更常见' },
            { en: 'neural architecture search', zh_options: ['神经架构搜索', '神经网络架构搜索'], recommended: '神经架构搜索 (NAS)', note: 'NAS 缩写已成行业通用' },
          ],
          source: 'ACL Anthology 术语库 + 中文 AI 社区惯例',
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 6,
        timestamp: demoTime(DEMO_BASE_TS.translator, 70_000),
        type: 'user',
        content: '第二段的"neural architecture"翻译成"神经网络架构"更准确，帮我改一下',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 7,
        timestamp: demoTime(DEMO_BASE_TS.translator, 88_000),
        type: 'response',
        model: 'deepseek-chat',
        content: `已将第二段中的"神经架构"统一替换为**"神经网络架构"**，以下是修订终稿：

---

Kubernetes 调度器（kube-scheduler）会根据 **资源请求（requests）**、**资源上限（limits）** 以及 **调度约束** 将 **Pod** 分配到 **Node（节点）** 上。

当一个 Pod 被创建但尚未绑定到节点时，它会进入 **调度队列**。默认调度器会先执行 **过滤谓词（filtering predicates）** 评估——例如 **node selector（节点选择器）**、**taints 与 tolerations（污点和容忍）**、**资源可用性** 等——随后在仍可行的节点上使用 **优先级函数（priority functions）** 进行排序。

**Pod 亲和性（affinity）与反亲和性（anti-affinity）** 规则用于让工作负载在拓扑上 **聚拢（co-located）** 或 **分散（spread）** 到不同故障域，以提高可用性或局部性。此类约束通常与 **神经网络架构（neural architecture）** 感知的调度策略结合使用，以优化推理工作负载的节点亲和性配置。

如果没有任何节点满足约束条件，该 Pod 会保持 **Pending（挂起）** 状态，直到集群状态发生变化或 **Pod 规约（Pod specification）** 被更新为止。`,
        inputTokens: 820,
        outputTokens: 340,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 6 — React Debug（debugger / gpt-4o）总时长约 95s，展示重试循环浪费 */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/debugger'),
      agentName: 'debugger',
      summary: 'React 报错 Cannot read properties of undefined (reading \'map\')，下面是组件代码。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 0),
        type: 'user',
        content: `我的 React 项目报错：Cannot read properties of undefined (reading 'map')。下面是组件代码，帮我看看咋修。

\`\`\`tsx
import { useEffect, useState } from "react";

export function List() {
  const [items, setItems] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <ul>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}
\`\`\``,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 4_000),
        type: 'thinking',
        model: 'gpt-4o',
        content:
          '典型原因：items 初始为 undefined，首屏 render 在 fetch 完成前就执行 items.map。先尝试 read_file 对上项目里的真实路径，确认完整上下文。',
        inputTokens: 420,
        outputTokens: 95,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 10_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'src/utils/helper.ts', offset: 0, limit: 200 }),
        inputTokens: 530,
        outputTokens: 72,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 15_000),
        type: 'tool_result',
        content: '',
        toolOutput: 'ENOENT: no such file or directory, open "src/utils/helper.ts"',
        error: 'ENOENT: no such file or directory, open "src/utils/helper.ts"',
        isError: true,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 20_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'src/lib/helper.ts', offset: 0, limit: 200 }),
        inputTokens: 620,
        outputTokens: 70,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 25_000),
        type: 'tool_result',
        content: '',
        toolOutput: 'ENOENT: no such file or directory, open "src/lib/helper.ts"',
        error: 'ENOENT: no such file or directory, open "src/lib/helper.ts"',
        isError: true,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 6,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 31_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'src/helpers/index.ts', offset: 0, limit: 200 }),
        inputTokens: 710,
        outputTokens: 68,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 7,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 36_000),
        type: 'tool_result',
        content: '',
        toolOutput: 'ENOENT: no such file or directory, open "src/helpers/index.ts"',
        error: 'ENOENT: no such file or directory, open "src/helpers/index.ts"',
        isError: true,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 8,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 42_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'lib/utils/helper.ts', offset: 0, limit: 200 }),
        inputTokens: 800,
        outputTokens: 70,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 9,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 47_000),
        type: 'tool_result',
        content: '',
        toolOutput: 'ENOENT: no such file or directory, open "lib/utils/helper.ts"',
        error: 'ENOENT: no such file or directory, open "lib/utils/helper.ts"',
        isError: true,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 10,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 53_000),
        type: 'thinking',
        model: 'gpt-4o',
        content:
          '已经尝试了 4 个路径都失败，可能组件文件在不同位置。让我试试 src/components/List.tsx，这是 React 组件的常见路径。',
        inputTokens: 890,
        outputTokens: 88,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 11,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 60_000),
        type: 'tool_call',
        model: 'gpt-4o',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'src/components/List.tsx', offset: 0, limit: 200 }),
        inputTokens: 990,
        outputTokens: 72,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 12,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 66_000),
        type: 'tool_result',
        content: '',
        toolOutput: `import { useEffect, useState } from "react";

export function List() {
  const [items, setItems] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  return (
    <ul>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}`,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 13,
        timestamp: demoTime(DEMO_BASE_TS.debugger, 93_000),
        type: 'response',
        model: 'gpt-4o',
        content: `## 原因

\`useState<string[] | undefined>(undefined)\` 让 **第一次渲染** 时 \`items\` 为 \`undefined\`。  
\`useEffect\` 里的请求是 **渲染之后才** 异步完成的，所以在数据返回前你已经执行了 \`items.map(...)\`，于是报 **Cannot read properties of undefined (reading 'map')**。

这不是 \`useEffect\` 依赖写错的问题，而是 **状态初值与首屏渲染不同步**。

## 修复方案（推荐）

把列表状态初始化为空数组，让 \`map\` 在首屏也对合法对象调用：

\`\`\`tsx
const [items, setItems] = useState<string[]>([]);
\`\`\`

若希望区分「未请求 / 加载中 / 空列表」，可以再加 \`loading\`、\`error\` 状态，在 UI 上分别渲染骨架屏或错误提示。

## 可选写法

若短期不想改类型，也可用可选链：

\`\`\`tsx
{(items ?? []).map((x) => (
  <li key={x}>{x}</li>
))}
\`\`\`

## 额外建议

确认 \`/api/items\` 返回的是 **数组**；若返回 \`{ data: [...] }\`，需要在 \`.then\` 里取对字段再 \`setItems\`，否则后续会变成「map 不是函数」类错误。`,
        inputTokens: 1_020,
        outputTokens: 360,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 7 — AI 热点速报（news-bot / deepseek-chat）总时长约 120s */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/news-bot'),
      agentName: 'news-bot',
      summary: '帮我整理今天的 AI 行业热点新闻，每条要有标题、摘要和来源。',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 0),
        type: 'user',
        content: '帮我整理今天的 AI 行业热点新闻，每条要有标题、摘要和来源，风格像简报，不要太长。',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 6_000),
        type: 'thinking',
        model: 'gemini-2.0-flash',
        content:
          '做两轮检索：一轮泛搜「AI 行业新闻 today」，一轮聚焦「大模型最新发布 2026」，合并去重后挑 5 条，统一标题+一两句摘要+来源名。',
        inputTokens: 290,
        outputTokens: 88,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 18_000),
        type: 'tool_call',
        model: 'gemini-2.0-flash',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ query: 'AI 行业新闻 today', freshness: 'day', lang: 'zh' }),
        inputTokens: 400,
        outputTokens: 70,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 38_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          items: [
            { title: '多国监管机构讨论生成式 AI 透明义务草案', source: 'TechPolicy Daily' },
            { title: '头部云厂商下调部分推理 API 区间价', source: 'CloudWatch Weekly' },
            { title: '开源社区发布新版模型评测榜单', source: 'OpenEval Hub' },
          ],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 4,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 52_000),
        type: 'tool_call',
        model: 'gemini-2.0-flash',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ query: '大模型最新发布 2026', max_results: 6 }),
        inputTokens: 620,
        outputTokens: 65,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 5,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 78_000),
        type: 'tool_result',
        content: '',
        toolOutput: JSON.stringify({
          items: [
            { title: '某多模态模型宣布上下文窗口扩展至百万级 token（实验室阶段）', source: 'AI Frontier Post' },
            { title: '边缘侧小模型在工业质检场景落地案例增多', source: 'Manufacturing AI Review' },
          ],
        }),
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 6,
        timestamp: demoTime(DEMO_BASE_TS.newsBot, 120_000),
        type: 'response',
        model: 'gemini-2.0-flash',
        content: `## 今日 AI 行业热点速报（简报）

**1. 多国监管机构讨论生成式 AI 透明义务草案**  
摘要：政策面向「训练数据披露、生成内容标识、第三方审计」靠拢，企业合规团队开始评估产品改造排期。  
来源：TechPolicy Daily

**2. 头部云厂商下调部分推理 API 区间价**  
摘要：中小团队在长尾场景上的试用成本下降，可能刺激更多「嵌入式 AI」原型；需留意冷启动与限流策略是否同步调整。  
来源：CloudWatch Weekly

**3. 开源社区发布新版模型评测榜单**  
摘要：评测维度覆盖推理、代码、多语言与安全拒绝率，社区呼吁统一可复现协议以减少「榜单刷分」。  
来源：OpenEval Hub

**4. 多模态模型宣布百万级上下文窗口（实验室阶段）**  
摘要：长文档与视频理解场景想象空间变大，工程侧关注延迟、成本与幻觉控制是否可产品化。  
来源：AI Frontier Post

**5. 边缘小模型在工业质检场景落地案例增多**  
摘要：工厂侧更关注离线推理与可解释性，「大模型在云端、判别模型在产线」的混合架构成为常见叙述。  
来源：Manufacturing AI Review

---

以上为基于检索摘要整理的速览，非投资建议；若你需要某一则展开成深度解读，可以指定序号。`,
        inputTokens: 880,
        outputTokens: 480,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),

  /* 8 — 邮件翻译（email-helper / gpt-4o）总时长约 18s，展示贵模型干轻活 */
  finalizeReplay({
    meta: {
      id: encodeURIComponent('demo/email-helper'),
      agentName: 'email-helper',
      summary: '帮我把这封英文邮件翻译成中文',
    },
    steps: [
      {
        index: 0,
        timestamp: demoTime(DEMO_BASE_TS.emailHelper, 0),
        type: 'user',
        content: `帮我把这封英文邮件翻译成中文：

Dear Team,

I hope this email finds you well. I wanted to follow up on our previous discussion regarding the Q1 project timeline. As we discussed in last week's meeting, we need to finalize the technical specifications by the end of this month.

Could you please review the attached document and share your feedback by Friday? This will help us stay on track with our delivery schedule.

Thank you for your cooperation.

Best regards,
John`,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 1,
        timestamp: demoTime(DEMO_BASE_TS.emailHelper, 5_000),
        type: 'thinking',
        model: 'gpt-4o',
        content:
          '这是一封简单的商务邮件，内容是关于项目进度跟进和文档审阅请求。我来翻译成中文，保持商务邮件的正式语气。',
        inputTokens: 820,
        outputTokens: 78,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 2,
        timestamp: demoTime(DEMO_BASE_TS.emailHelper, 17_500),
        type: 'response',
        model: 'gpt-4o',
        content: `亲爱的团队：

希望这封邮件送达时你们一切安好。我想跟进一下我们之前关于第一季度项目时间表的讨论。正如我们在上周会议中讨论的那样，我们需要在本月底前敲定技术规格说明。

能否请你们在周五之前审阅附件文档并分享反馈意见？这将帮助我们按计划完成交付进度。

感谢你们的配合。

此致
敬礼
John`,
        inputTokens: 920,
        outputTokens: 580,
        cost: 0,
        durationMs: 0,
      },
      {
        index: 3,
        timestamp: demoTime(DEMO_BASE_TS.emailHelper, 18_200),
        type: 'system',
        content: '会话完成：邮件翻译已完成。',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        durationMs: 0,
      },
    ],
  }),
];
