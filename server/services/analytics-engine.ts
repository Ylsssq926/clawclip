import type { KeywordItem, SessionTagMap, TagInfo, WordCloudData } from '../types/analytics.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';
import { sessionParser } from './session-parser.js';

const STOP_WORDS = new Set(
  [
    '的',
    '是',
    '在',
    '了',
    '我',
    '你',
    '他',
    '她',
    '它',
    '们',
    '这',
    '那',
    '有',
    '和',
    '就',
    '不',
    '人',
    '都',
    '一个',
    '上',
    '也',
    '很',
    '到',
    '说',
    '要',
    '去',
    '会',
    '着',
    '没有',
    '看',
    '好',
    '自己',
    '能',
    '下',
    '对',
    '后',
    '多',
    '么',
    '之',
    '为',
    '与',
    '或',
    '等',
    '及',
    '以',
    '于',
    '中',
    '其',
    '可',
    '将',
    '已',
    '把',
    '被',
    '从',
    '而',
    '还',
    '所',
    '里',
    '吗',
    '吧',
    '啊',
    '呢',
    '嘛',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'this',
    'that',
    'these',
    'those',
    'and',
    'or',
    'but',
    'not',
    'no',
    'for',
    'with',
    'from',
    'into',
    'onto',
    'about',
    'your',
    'you',
    'our',
    'their',
    'its',
    'his',
    'her',
    'them',
    'they',
    'we',
    'who',
    'what',
    'which',
    'when',
    'where',
    'why',
    'how',
    'all',
    'any',
    'each',
    'every',
    'some',
    'such',
    'than',
    'then',
    'there',
    'here',
    'can',
    'may',
    'might',
    'must',
    'shall',
    'just',
    'also',
    'only',
    'very',
    'too',
    'more',
    'most',
    'other',
    'out',
    'off',
    'over',
    'under',
    'again',
    'once',
    'both',
    'few',
    'own',
    'same',
    'so',
    'if',
    'because',
    'while',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'through',
    'per',
    'via',
  ].map(s => s.toLowerCase()),
);

const KNOWN_TOOLS = new Set([
  'web_search',
  'read_file',
  'write_file',
  'execute',
  'bash',
  'browser',
  'run_terminal_cmd',
  'grep',
  'glob',
  'list_dir',
  'search_replace',
  'delete_file',
  'fetch',
  'http',
  'mcp',
  'tool',
]);

const MODEL_SUBSTRINGS = [
  'gpt',
  'claude',
  'deepseek',
  'qwen',
  'minimax',
  'gemini',
  'llama',
  'mistral',
  'o1',
  '4o',
  '3.5',
  'sonnet',
  'opus',
  'haiku',
  'doubao',
  'ernie',
  'chat',
  'openai',
  'anthropic',
];

const ACTION_WORDS = new Set([
  '搜索',
  '分析',
  '编写',
  '修改',
  '创建',
  '调试',
  '优化',
  '执行',
  '读取',
  '写入',
  '检索',
  '总结',
  '翻译',
  '解释',
  '重构',
  'search',
  'analyze',
  'analyse',
  'write',
  'edit',
  'create',
  'debug',
  'optimize',
  'run',
  'execute',
  'read',
  'fix',
  'build',
  'implement',
]);

const TOPIC_WORDS = new Set([
  '代码',
  '数据',
  'api',
  '文件',
  '报告',
  '文案',
  '文章',
  '会话',
  '模型',
  '工具',
  '自动化',
  '工作流',
  'python',
  'javascript',
  'typescript',
  'json',
  'http',
  'sql',
  'code',
  'data',
  'file',
  'report',
  'agent',
  'token',
  'cost',
  'prompt',
  '小红书',
  '公众号',
]);

const TAG_COLORS: Record<string, string> = {
  搜索: '#06b6d4',
  编程: '#3b82f6',
  写作: '#ec4899',
  分析: '#8b5cf6',
  文件操作: '#f59e0b',
  高消耗: '#ef4444',
  快速问答: '#22c55e',
  通用: '#64748b',
};

const CJK_RE = /[\u4e00-\u9fff]+/g;
const ENG_RE = /[a-zA-Z][a-zA-Z0-9]*/g;

function isStopWord(w: string): boolean {
  const low = w.toLowerCase();
  return w.length === 0 || STOP_WORDS.has(low) || STOP_WORDS.has(w);
}

function extractChineseNgrams(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CJK_RE)) {
    const run = m[0];
    if (run.length < 2) continue;
    const maxN = Math.min(4, run.length);
    for (let n = 2; n <= maxN; n++) {
      for (let i = 0; i + n <= run.length; i++) {
        const gram = run.slice(i, i + n);
        if (!isStopWord(gram)) out.push(gram);
      }
    }
  }
  return out;
}

function extractEnglishWords(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(ENG_RE)) {
    const w = m[0].toLowerCase();
    if (w.length >= 3 && !isStopWord(w)) out.push(w);
  }
  return out;
}

function splitToolNameTokens(toolName: string): string[] {
  const low = toolName.trim().toLowerCase();
  if (!low) return [];
  const parts = low.split(/[_\-./]+/).filter(p => p.length > 0);
  const set = new Set<string>([low, ...parts]);
  return Array.from(set);
}

function tokenizePlainText(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/[\s\u3000]+/g, ' ');
  return [...extractChineseNgrams(normalized), ...extractEnglishWords(normalized)];
}

function classifyWord(word: string): KeywordItem['category'] {
  const low = word.toLowerCase();
  if (KNOWN_TOOLS.has(low) || [...KNOWN_TOOLS].some(t => low === t || low.includes(t))) {
    return 'tool';
  }
  if (MODEL_SUBSTRINGS.some(m => low.includes(m) || word.includes(m))) {
    return 'model';
  }
  if (ACTION_WORDS.has(word) || ACTION_WORDS.has(low)) {
    return 'action';
  }
  if (TOPIC_WORDS.has(word) || TOPIC_WORDS.has(low)) {
    return 'topic';
  }
  return 'other';
}

function stepTextParts(step: SessionStep): { content: string; toolName: string; toolInput: string; toolOutput: string } {
  return {
    content: step.content ?? '',
    toolName: step.toolName ?? '',
    toolInput: step.toolInput ?? '',
    toolOutput: step.toolOutput ?? '',
  };
}

function collectKeywordWeights(replay: SessionReplay): Map<string, number> {
  const weights = new Map<string, number>();

  const add = (word: string, delta: number) => {
    if (!word || isStopWord(word)) return;
    const key = /[\u4e00-\u9fff]/.test(word) ? word : word.toLowerCase();
    if (isStopWord(key)) return;
    weights.set(key, (weights.get(key) ?? 0) + delta);
  };

  for (const step of replay.steps) {
    const { content, toolName, toolInput, toolOutput } = stepTextParts(step);

    for (const t of tokenizePlainText(content)) {
      const lowT = t.toLowerCase();
      const delta = MODEL_SUBSTRINGS.some(m => lowT.includes(m)) ? 2 : 1;
      add(t, delta);
    }

    for (const t of tokenizePlainText(toolInput)) add(t, 1);
    for (const t of tokenizePlainText(toolOutput)) add(t, 1);

    if (toolName) {
      for (const tok of splitToolNameTokens(toolName)) {
        if (tok.length >= 2 || /[\u4e00-\u9fff]/.test(tok)) add(tok, 3);
      }
    }

    if (step.model) {
      for (const t of tokenizePlainText(step.model)) {
        if (MODEL_SUBSTRINGS.some(m => t.includes(m))) add(t, 2);
      }
      for (const m of MODEL_SUBSTRINGS) {
        if (step.model.toLowerCase().includes(m)) add(m, 2);
      }
    }
  }

  return weights;
}

function hasCodeFenceInResponses(steps: SessionStep[]): boolean {
  return steps.some(s => s.type === 'response' && /```/.test(s.content ?? ''));
}

function hasWritingHints(text: string): boolean {
  return /小红书|公众号|文案|文章/.test(text);
}

function hasAnalysisHints(text: string): boolean {
  return /分析|报告|数据/.test(text);
}

function hasFileTools(steps: SessionStep[]): boolean {
  return steps.some(
    s => s.type === 'tool_call' && (s.toolName === 'read_file' || s.toolName === 'write_file'),
  );
}

function hasSearchTool(steps: SessionStep[]): boolean {
  return steps.some(
    s => s.type === 'tool_call' && s.toolName && /search/i.test(s.toolName),
  );
}

function buildTagsForReplay(replay: SessionReplay): string[] {
  const tags: string[] = [];
  const steps = replay.steps;
  const allText = steps.map(s => s.content ?? '').join('\n');

  if (hasSearchTool(steps)) tags.push('搜索');
  if (hasCodeFenceInResponses(steps)) tags.push('编程');
  if (hasWritingHints(allText)) tags.push('写作');
  if (hasAnalysisHints(allText)) tags.push('分析');
  if (hasFileTools(steps)) tags.push('文件操作');
  if (replay.meta.totalCost > 0.1) tags.push('高消耗');
  if (replay.meta.stepCount < 3) tags.push('快速问答');

  const unique = [...new Set(tags)];
  const picked = unique.slice(0, 3);
  if (picked.length === 0) return ['通用'];
  return picked;
}

function loadAllReplays(): SessionReplay[] {
  const metas = sessionParser.getSessions();
  const out: SessionReplay[] = [];
  const seen = new Set<string>();
  for (const m of metas) {
    const r = sessionParser.getSessionReplay(m.id);
    if (!r || seen.has(r.meta.id)) continue;
    seen.add(r.meta.id);
    out.push(r);
  }
  return out;
}

function filterByDays(replays: SessionReplay[], days?: number): SessionReplay[] {
  if (days == null || days <= 0 || !Number.isFinite(days)) return replays;
  const cutoff = Date.now() - days * 86400000;
  return replays.filter(rep => rep.meta.endTime.getTime() >= cutoff);
}

export class AnalyticsEngine {
  getKeywords(days?: number, limit?: number): WordCloudData {
    const lim = limit != null && limit > 0 ? limit : 50;
    const replays = filterByDays(loadAllReplays(), days);
    const merged = new Map<string, number>();

    let analyzedSteps = 0;
    for (const replay of replays) {
      analyzedSteps += replay.steps.length;
      const w = collectKeywordWeights(replay);
      for (const [k, v] of w) merged.set(k, (merged.get(k) ?? 0) + v);
    }

    const keywords: KeywordItem[] = Array.from(merged.entries())
      .map(([word, count]) => ({
        word,
        count: Math.round(count * 1000) / 1000,
        category: classifyWord(word),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, lim);

    return {
      keywords,
      totalSessions: replays.length,
      analyzedSteps,
    };
  }

  getSessionTags(): SessionTagMap {
    const map: SessionTagMap = {};
    for (const replay of loadAllReplays()) {
      map[replay.meta.id] = buildTagsForReplay(replay);
    }
    return map;
  }

  getTags(): TagInfo[] {
    const sessionMap = this.getSessionTags();
    const counts = new Map<string, number>();
    for (const tags of Object.values(sessionMap)) {
      for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const list: TagInfo[] = Array.from(counts.entries()).map(([tag, sessionCount]) => ({
      tag,
      sessionCount,
      color: TAG_COLORS[tag] ?? '#64748b',
    }));
    list.sort((a, b) => b.sessionCount - a.sessionCount || a.tag.localeCompare(b.tag, 'zh-CN'));
    return list;
  }

  getSessionsByTag(tag: string): string[] {
    const sessionMap = this.getSessionTags();
    const ids: string[] = [];
    for (const [id, tags] of Object.entries(sessionMap)) {
      if (tags.includes(tag)) ids.push(id);
    }
    return ids;
  }
}

export const analyticsEngine = new AnalyticsEngine();
