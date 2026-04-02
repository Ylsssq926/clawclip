import { Router } from 'express';
import { sessionParser } from '../services/session-parser.js';
import { benchmarkRunner } from '../services/benchmark-runner.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';
import type { BenchmarkResult, DimensionScore } from '../types/benchmark.js';

const router = Router();

const BRAND_BLUE = '#3b82c4';
const BG = '#0f172a';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs > 0 ? `${m} min ${rs} s` : `${m} min`;
}

function formatCostUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  if (n < 0.01) return `< $0.01`;
  return `$${n.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

function stepTypeIcon(type: SessionStep['type']): string {
  switch (type) {
    case 'thinking':
      return '💭';
    case 'tool_call':
      return '🔧';
    case 'tool_result':
      return '📤';
    case 'response':
      return '💬';
    case 'user':
      return '👤';
    case 'system':
      return '⚙️';
    default:
      return '•';
  }
}

function stepShortLabel(step: SessionStep): string {
  if (step.type === 'tool_call' && step.toolName) {
    return step.toolName;
  }
  const raw = (step.content || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= 48) return raw || step.type;
  return `${raw.slice(0, 45)}…`;
}

function layoutShell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: ${BG};
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px 40px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(59, 130, 196, 0.35);
      border-radius: 20px;
      padding: 28px 24px 22px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.04) inset;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }
    .brand-mark { font-size: 28px; line-height: 1; }
    .brand-text { display: flex; flex-direction: column; gap: 2px; }
    .brand-name { font-size: 1.15rem; font-weight: 700; letter-spacing: 0.02em; color: #f8fafc; }
    .brand-sub { font-size: 0.75rem; color: #94a3b8; }
    .muted { color: #94a3b8; font-size: 0.8rem; }
    .summary {
      font-size: 0.92rem;
      line-height: 1.55;
      color: #cbd5e1;
      margin-bottom: 16px;
    }
    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .badge {
      font-size: 0.7rem;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(59, 130, 196, 0.2);
      color: #7dd3fc;
      border: 1px solid rgba(59, 130, 196, 0.35);
    }
    .badge-model { background: rgba(148, 163, 184, 0.15); color: #e2e8f0; border-color: rgba(148, 163, 184, 0.25); }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .metric {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    .metric-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 4px; }
    .metric-value { font-size: 0.95rem; font-weight: 600; color: #f1f5f9; }
    .steps-title { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .step-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.8rem;
      color: #cbd5e1;
      padding: 6px 0;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    }
    .step-row:last-child { border-bottom: none; }
    .step-ico { flex-shrink: 0; width: 22px; text-align: center; }
    .step-txt { flex: 1; word-break: break-word; line-height: 1.4; }
    .footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(51, 65, 85, 0.6);
      font-size: 0.78rem;
      color: ${BRAND_BLUE};
      text-align: center;
      line-height: 1.5;
    }
    .footer a { color: ${BRAND_BLUE}; text-decoration: none; }
    .corner {
      position: fixed;
      right: 14px;
      bottom: 10px;
      font-size: 0.65rem;
      color: #475569;
    }
    .hero-rank {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 12px;
      margin: 8px 0 20px;
    }
    .rank-letter {
      font-size: 4.5rem;
      font-weight: 800;
      line-height: 1;
      color: ${BRAND_BLUE};
      text-shadow: 0 0 32px rgba(59, 130, 196, 0.45);
    }
    .score-block { text-align: left; }
    .score-num { font-size: 2rem; font-weight: 700; color: #f8fafc; }
    .score-label { font-size: 0.75rem; color: #94a3b8; }
    .dim-row { margin-bottom: 10px; }
    .dim-head { display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 4px; color: #94a3b8; }
    .dim-bar-bg {
      height: 8px;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.9);
      overflow: hidden;
      border: 1px solid rgba(51, 65, 85, 0.6);
    }
    .dim-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, ${BRAND_BLUE}, #38bdf8);
      min-width: 0;
    }
    .notfound { text-align: center; padding: 24px 8px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">${inner}</div>
  <div class="corner">QQ 469906100</div>
</body>
</html>`;
}

function footerBlock(): string {
  return `<div class="footer">在 ClawClip 查看完整回放 → <a href="https://github.com/Ylsssq926/clawclip" rel="noopener noreferrer">github.com/Ylsssq926/clawclip</a></div>`;
}

function replayMetaSubtitle(meta: SessionReplay['meta']): string {
  const parts: string[] = [];
  if (typeof meta.storeChannel === 'string' && meta.storeChannel.trim()) parts.push(meta.storeChannel.trim());
  const prov = typeof meta.storeProvider === 'string' ? meta.storeProvider.trim() : '';
  if (prov && prov !== meta.storeChannel?.trim()) parts.push(prov);
  if (typeof meta.storeModel === 'string' && meta.storeModel.trim()) parts.push(meta.storeModel.trim());
  if (typeof meta.storeContextTokens === 'number' && meta.storeContextTokens > 0) {
    parts.push(`~${meta.storeContextTokens.toLocaleString()} ctx tok`);
  }
  return parts.join(' · ');
}

function renderReplayHtml(replay: SessionReplay): string {
  const { meta, steps } = replay;
  const headline =
    (typeof meta.sessionLabel === 'string' && meta.sessionLabel.trim()) ||
    (typeof meta.summary === 'string' && meta.summary.trim()) ||
    '（无摘要）';
  const sub = replayMetaSubtitle(meta);
  const models = meta.modelUsed?.length ? meta.modelUsed : [];
  const badgeAgent = `<span class="badge">${escapeHtml(meta.agentName || 'Agent')}</span>`;
  const badgeModels = models
    .slice(0, 4)
    .map(m => `<span class="badge badge-model">${escapeHtml(m)}</span>`)
    .join('');
  const thumbSteps = steps.slice(0, 8);
  const stepRows = thumbSteps
    .map(
      s =>
        `<div class="step-row"><span class="step-ico">${stepTypeIcon(s.type)}</span><span class="step-txt">${escapeHtml(stepShortLabel(s))}</span></div>`
    )
    .join('');

  const inner = `
    <div class="brand">
      <span class="brand-mark">🍤</span>
      <div class="brand-text">
        <span class="brand-name">虾片 ClawClip</span>
        <span class="brand-sub">会话回放分享</span>
      </div>
    </div>
    <p class="summary">${escapeHtml(headline)}</p>
    ${sub ? `<p class="muted" style="font-size:12px;margin-top:-6px;margin-bottom:10px">${escapeHtml(sub)}</p>` : ''}
    <div class="badges">${badgeAgent}${badgeModels}</div>
    <div class="metrics">
      <div class="metric"><div class="metric-label">步骤数</div><div class="metric-value">${meta.stepCount}</div></div>
      <div class="metric"><div class="metric-label">用时</div><div class="metric-value">${escapeHtml(formatDurationMs(meta.durationMs))}</div></div>
      <div class="metric"><div class="metric-label">花费</div><div class="metric-value">${escapeHtml(formatCostUsd(meta.totalCost))}</div></div>
      <div class="metric"><div class="metric-label">Token</div><div class="metric-value">${escapeHtml(formatTokens(meta.totalTokens))}</div></div>
    </div>
    <div class="steps-title">步骤缩略</div>
    ${stepRows || '<p class="muted">暂无步骤</p>'}
    ${footerBlock()}
  `;

  return layoutShell(`回放 · ${meta.agentName}`, inner);
}

function renderBenchmarkHtml(result: BenchmarkResult): string {
  const dims: DimensionScore[] = result.dimensions?.length ? result.dimensions : [];
  const dimBars = dims
    .map(d => {
      const pct = Math.max(0, Math.min(100, Math.round(d.score)));
      return `<div class="dim-row">
        <div class="dim-head"><span>${escapeHtml(d.label)}</span><span>${pct}</span></div>
        <div class="dim-bar-bg"><div class="dim-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    })
    .join('');

  const inner = `
    <div class="brand">
      <span class="brand-mark">🍤</span>
      <div class="brand-text">
        <span class="brand-name">虾片 ClawClip</span>
        <span class="brand-sub">AI Agent 能力评测</span>
      </div>
    </div>
    <div class="hero-rank">
      <span class="rank-letter">${escapeHtml((result.rank || '?').slice(0, 1).toUpperCase())}</span>
      <div class="score-block">
        <div class="score-num">${result.overallScore}</div>
        <div class="score-label">综合分</div>
      </div>
    </div>
    ${dimBars}
    <p class="summary" style="margin-top:14px">${escapeHtml(result.summary || '—')}</p>
    <div class="metrics">
      <div class="metric"><div class="metric-label">会话数</div><div class="metric-value">${result.totalSessions}</div></div>
      <div class="metric"><div class="metric-label">Token</div><div class="metric-value">${escapeHtml(formatTokens(result.totalTokens))}</div></div>
      <div class="metric"><div class="metric-label">花费</div><div class="metric-value">${escapeHtml(formatCostUsd(result.totalCost))}</div></div>
      <div class="metric"><div class="metric-label">常用模型</div><div class="metric-value" style="font-size:0.82rem">${escapeHtml(result.topModel || '—')}</div></div>
    </div>
    ${footerBlock()}
  `;

  return layoutShell(`评测 · ${result.rank} / ${result.overallScore}`, inner);
}

function notFoundPage(msg: string): string {
  const inner = `<div class="notfound"><p>${escapeHtml(msg)}</p></div>${footerBlock()}`;
  return layoutShell('ClawClip', inner);
}

function findBenchmarkById(rawId: string): BenchmarkResult | null {
  let decoded = rawId;
  try {
    decoded = decodeURIComponent(rawId);
  } catch {
    /* keep raw */
  }
  const { results } = benchmarkRunner.getHistory();
  return results.find(r => r.id === rawId || r.id === decoded) ?? null;
}

/** GET /share/replay/:id */
router.get('/replay/:id', (req, res, next) => {
  try {
    const replay = sessionParser.getSessionReplay(req.params.id);
    if (!replay) {
      res.status(404).type('html').send(notFoundPage('未找到该会话，可能已删除或 ID 不正确。'));
      return;
    }
    res.type('html').send(renderReplayHtml(replay));
  } catch (e) {
    next(e);
  }
});

/** GET /share/benchmark/:id */
router.get('/benchmark/:id', (req, res, next) => {
  try {
    const result = findBenchmarkById(req.params.id);
    if (!result) {
      res.status(404).type('html').send(notFoundPage('未找到该评测记录。可先运行评测后再分享。'));
      return;
    }
    res.type('html').send(renderBenchmarkHtml(result));
  } catch (e) {
    next(e);
  }
});

export default router;
