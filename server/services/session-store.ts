import * as fs from 'fs';
import * as path from 'path';
import type { SessionMeta } from '../types/replay.js';

/** 一条 sessions.json 中的记录（key 为 sessionKey） */
export interface SessionStoreRow {
  sessionKey: string;
  raw: Record<string, unknown>;
}

/**
 * 读取 OpenClaw 官方 session store（agents/<id>/sessions/sessions.json）。
 * 损坏或非对象时返回 null，不抛错。
 */
export function loadOpenclawSessionStore(sessionsDir: string): SessionStoreRow[] | null {
  const p = path.join(sessionsDir, 'sessions.json');
  if (!fs.existsSync(p)) return null;
  let text: string;
  try {
    text = fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const rows: SessionStoreRow[] = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push({ sessionKey: k, raw: v as Record<string, unknown> });
    }
  }
  return rows;
}

export function matchTranscriptToStoreRow(
  rows: SessionStoreRow[],
  transcriptBaseName: string,
): SessionStoreRow | null {
  for (const row of rows) {
    const e = row.raw;
    if (typeof e.sessionId === 'string' && e.sessionId === transcriptBaseName) return row;
    const sf = e.sessionFile;
    if (typeof sf === 'string') {
      const bn = path.basename(sf);
      if (bn === `${transcriptBaseName}.jsonl` || bn === transcriptBaseName) return row;
      const stem = bn.endsWith('.jsonl') ? bn.slice(0, -'.jsonl'.length) : bn;
      if (stem === transcriptBaseName) return row;
    }
  }
  return null;
}

function labelFromEntry(e: Record<string, unknown>): string {
  if (typeof e.label === 'string' && e.label.trim()) return e.label.trim();
  const o = e.origin;
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    const l = (o as Record<string, unknown>).label;
    if (typeof l === 'string' && l.trim()) return l.trim();
  }
  if (typeof e.displayName === 'string' && e.displayName.trim()) return e.displayName.trim();
  return '';
}

function updatedAtMs(e: Record<string, unknown>): number | undefined {
  const u = e.updatedAt;
  if (typeof u === 'number' && Number.isFinite(u)) return u;
  if (typeof u === 'string') {
    const t = Date.parse(u);
    if (!Number.isNaN(t)) return t;
  }
  return undefined;
}

/** 用 session store 补全展示名、sessionKey、最近活动时间（与 Gateway 列表更一致） */
export function enrichSessionMetaFromStore(
  meta: SessionMeta,
  rows: SessionStoreRow[] | null,
  transcriptBaseName: string,
): void {
  if (!rows?.length) return;
  const hit = matchTranscriptToStoreRow(rows, transcriptBaseName);
  if (!hit) return;
  const e = hit.raw;
  const lab = labelFromEntry(e);
  if (lab) {
    meta.sessionLabel = lab;
    const s = meta.summary?.trim() ?? '';
    if (s.length < 4) meta.summary = lab.slice(0, 80);
  }
  meta.sessionKey = hit.sessionKey;
  const u = updatedAtMs(e);
  if (u != null) meta.storeUpdatedAt = u;
}
