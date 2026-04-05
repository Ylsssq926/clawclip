import { Router, type Request } from 'express';
import fs from 'fs';
import path from 'path';
import { getClawclipStateDir } from '../services/agent-data-root.js';
import { benchmarkRunner } from '../services/benchmark-runner.js';

const router = Router();

const submitRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 小时
const RATE_MAX_SUBMITS = 3; // 每小时最多 3 次

const MAX_NICKNAMES_PER_IP = 3;

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]!.trim();
  return req.socket.remoteAddress || 'unknown';
}

type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = submitRateLimit.get(ip);
  if (!entry || now >= entry.resetAt) {
    submitRateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= RATE_MAX_SUBMITS) {
    return { ok: false, retryAfterMs: Math.max(0, entry.resetAt - now) };
  }
  entry.count++;
  return { ok: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of submitRateLimit) {
    if (now >= entry.resetAt) submitRateLimit.delete(ip);
  }
}, 10 * 60 * 1000);

function sanitizeNickname(raw: string): string | null {
  let s = raw.trim().replace(/<[^>]*>/g, '');
  s = s.replace(/[\x00-\x1F\x7F]/g, '');
  if (s.length < 1 || s.length > 20) return null;
  return s;
}

function rankMatchesOverall(rank: string, overallScore: number): boolean {
  if (overallScore < 0 || overallScore > 100) return false;
  if (rank === 'S') return overallScore >= 90;
  if (rank === 'A') return overallScore >= 75 && overallScore < 90;
  if (rank === 'B') return overallScore >= 60 && overallScore < 75;
  if (rank === 'C') return overallScore >= 45 && overallScore < 60;
  if (rank === 'D') return overallScore < 45;
  return false;
}

function validateLatestForSubmit(latest: {
  overallScore: number;
  rank: string;
  dimensions: { score: number }[];
  totalSessions: number;
}): string | null {
  const { overallScore, rank, dimensions, totalSessions } = latest;
  if (typeof overallScore !== 'number' || Number.isNaN(overallScore)) return '分数无效 / Invalid score';
  if (overallScore < 0 || overallScore > 100) return '总分须在 0–100 / Score must be 0-100';
  if (!['S', 'A', 'B', 'C', 'D'].includes(rank)) return '段位无效 / Invalid rank';
  if (!rankMatchesOverall(rank, overallScore)) return '段位与总分不一致 / Rank does not match score';
  if (typeof totalSessions !== 'number' || !Number.isFinite(totalSessions) || totalSessions <= 0) {
    return '会话数须大于 0 / Sessions must be > 0';
  }
  if (!Array.isArray(dimensions) || dimensions.length !== 6) return '须包含 6 个维度 / Must have 6 dimensions';
  let dimSum = 0;
  for (const d of dimensions) {
    if (typeof d.score !== 'number' || Number.isNaN(d.score) || d.score < 0 || d.score > 100) {
      return '维度分数须在 0-100 / Dimension score must be 0-100';
    }
    dimSum += d.score;
  }
  const dimAvg = dimSum / dimensions.length;
  if (Math.abs(dimAvg - overallScore) > 15) {
    return '维度均分与总分差距过大 / Dimension average diverges too far from overall score';
  }
  if (totalSessions < 2) {
    return '至少需要 2 条会话 / At least 2 sessions required';
  }
  return null;
}

function leaderboardPath(): string {
  return path.join(getClawclipStateDir(), 'leaderboard.json');
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  rank: string;
  topModel: string;
  totalSessions: number;
  dimensions: { dimension: string; score: number }[];
  submittedAt: string;
  /** 内部字段，GET 响应时剔除 */
  _ip?: string;
}

function distinctNicknamesForIp(entries: LeaderboardEntry[], ip: string): Set<string> {
  const set = new Set<string>();
  for (const e of entries) {
    if (e._ip === ip) set.add(e.nickname);
  }
  return set;
}

function ensureLeaderboardDir(): void {
  fs.mkdirSync(path.dirname(leaderboardPath()), { recursive: true });
}

function newEntryId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 内置 Demo：文件不存在时 GET 返回此列表（不写盘） */
const DEMO_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'demo-deep',
    nickname: 'DeepLobster',
    score: 92,
    rank: 'S',
    topModel: 'deepseek-chat',
    totalSessions: 156,
    dimensions: [
      { dimension: 'writing', score: 93 },
      { dimension: 'coding', score: 91 },
      { dimension: 'toolUse', score: 94 },
      { dimension: 'search', score: 90 },
      { dimension: 'safety', score: 92 },
      { dimension: 'costEfficiency', score: 89 },
    ],
    submittedAt: '2025-03-18T02:30:00.000Z',
  },
  {
    id: 'demo-code',
    nickname: 'CodeWizard',
    score: 88,
    rank: 'A',
    topModel: 'gpt-4o',
    totalSessions: 98,
    dimensions: [
      { dimension: 'writing', score: 82 },
      { dimension: 'coding', score: 95 },
      { dimension: 'toolUse', score: 88 },
      { dimension: 'search', score: 85 },
      { dimension: 'safety', score: 90 },
      { dimension: 'costEfficiency', score: 86 },
    ],
    submittedAt: '2025-03-17T14:20:00.000Z',
  },
  {
    id: 'demo-eff',
    nickname: 'SpeedRunner',
    score: 85,
    rank: 'A',
    topModel: 'deepseek-chat',
    totalSessions: 210,
    dimensions: [
      { dimension: 'writing', score: 84 },
      { dimension: 'coding', score: 86 },
      { dimension: 'toolUse', score: 92 },
      { dimension: 'search', score: 83 },
      { dimension: 'safety', score: 84 },
      { dimension: 'costEfficiency', score: 91 },
    ],
    submittedAt: '2025-03-16T09:15:00.000Z',
  },
  {
    id: 'demo-shrimp',
    nickname: 'AgentPro',
    score: 81,
    rank: 'A',
    topModel: 'claude-sonnet-4',
    totalSessions: 72,
    dimensions: [
      { dimension: 'writing', score: 88 },
      { dimension: 'coding', score: 78 },
      { dimension: 'toolUse', score: 80 },
      { dimension: 'search', score: 79 },
      { dimension: 'safety', score: 85 },
      { dimension: 'costEfficiency', score: 77 },
    ],
    submittedAt: '2025-03-15T22:00:00.000Z',
  },
  {
    id: 'demo-explore',
    nickname: 'Explorer',
    score: 78,
    rank: 'A',
    topModel: 'gpt-4o-mini',
    totalSessions: 134,
    dimensions: [
      { dimension: 'writing', score: 80 },
      { dimension: 'coding', score: 76 },
      { dimension: 'toolUse', score: 77 },
      { dimension: 'search', score: 82 },
      { dimension: 'safety', score: 78 },
      { dimension: 'costEfficiency', score: 85 },
    ],
    submittedAt: '2025-03-14T11:45:00.000Z',
  },
  {
    id: 'demo-new',
    nickname: 'Beginner',
    score: 72,
    rank: 'B',
    topModel: 'deepseek-chat',
    totalSessions: 45,
    dimensions: [
      { dimension: 'writing', score: 74 },
      { dimension: 'coding', score: 70 },
      { dimension: 'toolUse', score: 71 },
      { dimension: 'search', score: 73 },
      { dimension: 'safety', score: 75 },
      { dimension: 'costEfficiency', score: 69 },
    ],
    submittedAt: '2025-03-13T16:30:00.000Z',
  },
  {
    id: 'demo-xhs',
    nickname: 'ContentKing',
    score: 68,
    rank: 'B',
    topModel: 'qwen-max',
    totalSessions: 88,
    dimensions: [
      { dimension: 'writing', score: 82 },
      { dimension: 'coding', score: 62 },
      { dimension: 'toolUse', score: 65 },
      { dimension: 'search', score: 70 },
      { dimension: 'safety', score: 68 },
      { dimension: 'costEfficiency', score: 63 },
    ],
    submittedAt: '2025-03-12T08:00:00.000Z',
  },
  {
    id: 'demo-fish',
    nickname: 'ChillBot',
    score: 61,
    rank: 'B',
    topModel: 'deepseek-chat',
    totalSessions: 33,
    dimensions: [
      { dimension: 'writing', score: 65 },
      { dimension: 'coding', score: 58 },
      { dimension: 'toolUse', score: 60 },
      { dimension: 'search', score: 62 },
      { dimension: 'safety', score: 64 },
      { dimension: 'costEfficiency', score: 58 },
    ],
    submittedAt: '2025-03-11T19:20:00.000Z',
  },
  {
    id: 'demo-pit',
    nickname: 'Rookie',
    score: 52,
    rank: 'C',
    topModel: 'gpt-4o-mini',
    totalSessions: 19,
    dimensions: [
      { dimension: 'writing', score: 55 },
      { dimension: 'coding', score: 48 },
      { dimension: 'toolUse', score: 52 },
      { dimension: 'search', score: 54 },
      { dimension: 'safety', score: 58 },
      { dimension: 'costEfficiency', score: 51 },
    ],
    submittedAt: '2025-03-10T06:10:00.000Z',
  },
  {
    id: 'demo-pass',
    nickname: 'Passerby',
    score: 45,
    rank: 'C',
    topModel: 'gpt-4o',
    totalSessions: 12,
    dimensions: [
      { dimension: 'writing', score: 48 },
      { dimension: 'coding', score: 42 },
      { dimension: 'toolUse', score: 44 },
      { dimension: 'search', score: 46 },
      { dimension: 'safety', score: 50 },
      { dimension: 'costEfficiency', score: 40 },
    ],
    submittedAt: '2025-03-09T12:00:00.000Z',
  },
];

function readStored(): LeaderboardEntry[] | null {
  if (!fs.existsSync(leaderboardPath())) return null;
  try {
    const raw = fs.readFileSync(leaderboardPath(), 'utf-8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data as LeaderboardEntry[];
  } catch {
    return [];
  }
}

function writeStored(entries: LeaderboardEntry[]): void {
  ensureLeaderboardDir();
  fs.writeFileSync(leaderboardPath(), JSON.stringify(entries, null, 2), 'utf-8');
}

function sortByScoreDesc(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.score - a.score);
}

/** 同一昵称只保留最高分；同分保留提交时间更新的 */
function dedupeNicknameKeepBest(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const byNick = new Map<string, LeaderboardEntry>();
  for (const e of entries) {
    const prev = byNick.get(e.nickname);
    if (!prev) {
      byNick.set(e.nickname, e);
      continue;
    }
    if (e.score > prev.score) {
      byNick.set(e.nickname, e);
    } else if (e.score === prev.score && new Date(e.submittedAt).getTime() > new Date(prev.submittedAt).getTime()) {
      byNick.set(e.nickname, e);
    }
  }
  return Array.from(byNick.values());
}

router.get('/', (req, res) => {
  try {
    const rawLimit = req.query.limit;
    const parsed = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : 50;
    const limit = Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 50;
    const stored = readStored();
    const source = stored === null ? DEMO_ENTRIES : stored;
    const sorted = sortByScoreDesc(source);
    const sanitized = sorted.map(({ _ip, ...rest }) => rest);
    res.json({
      entries: sanitized.slice(0, limit),
      isDemo: stored === null,
    });
  } catch (e) {
    res.status(500).json({ error: '获取排行榜失败 / Failed to get leaderboard', detail: String(e) });
  }
});

router.post('/submit', (req, res) => {
  try {
    const ip = getClientIP(req);
    const rl = checkRateLimit(ip);
    if (!rl.ok) {
      res.status(429).json({
        error: '提交太频繁 / Too many submissions (max 3 per hour)',
        retryAfterMs: rl.retryAfterMs,
      });
      return;
    }

    const raw = req.body?.nickname;
    const nickname =
      typeof raw === 'string' ? sanitizeNickname(raw) : null;
    if (nickname === null) {
      res.status(400).json({ error: '昵称长度须为 1–20 字符 / Nickname must be 1-20 characters' });
      return;
    }

    const latest = benchmarkRunner.getLatest();
    if (!latest) {
      res.status(400).json({ error: '暂无评测结果 / No benchmark results yet' });
      return;
    }
    if (latest.dataSource === 'demo' || latest.id.startsWith('benchmark-demo')) {
      res.status(400).json({
        error: 'Demo 评测结果不能提交到排行榜 / Demo results cannot be submitted to leaderboard',
        code: 'DEMO_NOT_SUBMITTABLE',
      });
      return;
    }
    const invalidReason = validateLatestForSubmit(latest);
    if (invalidReason) {
      res.status(400).json({ error: invalidReason });
      return;
    }

    const prevStored = readStored();
    const base = prevStored === null ? [] : [...prevStored];
    const nicksForIp = distinctNicknamesForIp(base, ip);
    if (!nicksForIp.has(nickname) && nicksForIp.size >= MAX_NICKNAMES_PER_IP) {
      res.status(400).json({ error: '同一 IP 最多 3 个昵称 / Max 3 nicknames per IP' });
      return;
    }

    const newEntry: LeaderboardEntry = {
      id: newEntryId(),
      nickname,
      score: latest.overallScore,
      rank: latest.rank,
      topModel: latest.topModel,
      totalSessions: latest.totalSessions,
      dimensions: latest.dimensions.map(d => ({ dimension: d.dimension, score: d.score })),
      submittedAt: new Date().toISOString(),
      _ip: ip,
    };
    base.push(newEntry);
    const merged = dedupeNicknameKeepBest(base);
    writeStored(merged);
    const saved = merged.find(e => e.nickname === nickname);
    if (!saved) {
      res.status(500).json({ error: '保存排行榜失败 / Failed to save leaderboard' });
      return;
    }
    const sorted = sortByScoreDesc(merged);
    const rank_position = sorted.findIndex(e => e.id === saved.id) + 1;
    const { _ip: _, ...safeEntry } = saved;
    res.json({ entry: safeEntry, rank_position });
  } catch (e) {
    res.status(500).json({ error: '提交排行榜失败 / Failed to submit', detail: String(e) });
  }
});

export default router;
