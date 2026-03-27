import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 数据根探测（对齐 OpenClaw 当前文档，约 2026）：
 * - 会话转写：`agents/<agentId>/sessions/*.jsonl`；同目录有 `sessions.json` 元数据（本模块不把其当 JSONL 解析）
 * - 官方变量：`OPENCLAW_STATE_DIR`（默认 ~/.openclaw）；避免把 OPENCLAW_HOME 设成已以 `.openclaw` 结尾的路径以防嵌套目录问题
 */

/** 与 OpenClaw / ZeroClaw 等「龙虾」数据目录布局兼容的探测结果 */
export interface LobsterDataRoot {
  id: string;
  label: string;
  homeDir: string;
  agentsDir: string;
}

const DEFAULT_SCAN = [
  { id: 'openclaw', dirname: '.openclaw', label: 'OpenClaw' },
  { id: 'zeroclaw', dirname: '.zeroclaw', label: 'ZeroClaw' },
  { id: 'claw', dirname: '.claw', label: 'Claw' },
] as const;

function expandHome(p: string): string {
  const t = p.trim();
  if (t === '~') return os.homedir();
  if (t.startsWith('~/') || t.startsWith('~\\')) {
    return path.join(os.homedir(), t.slice(2));
  }
  return path.resolve(t);
}

function safeRealpath(dir: string): string {
  try {
    return fs.realpathSync(dir);
  } catch {
    return path.resolve(dir);
  }
}

/**
 * 用户额外指定数据根（逗号/分号分隔），适合自定义安装路径或 Docker 挂载。
 * 例：CLAWCLIP_LOBSTER_DIRS=/data/my-agent-home
 */
function envExtraRoots(): string[] {
  const raw = process.env.CLAWCLIP_LOBSTER_DIRS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

// ── 可配置会话文件扩展名 ──

const DEFAULT_SESSION_EXTENSIONS = ['.jsonl'];
let _cachedExtensions: string[] | null = null;

/**
 * 获取会话文件扩展名列表。
 * 可通过环境变量 `CLAWCLIP_SESSION_EXTENSIONS` 配置（逗号分隔），默认 ['.jsonl']。
 */
export function getSessionFileExtensions(): string[] {
  if (_cachedExtensions) return _cachedExtensions;
  const raw = process.env.CLAWCLIP_SESSION_EXTENSIONS?.trim();
  if (raw) {
    const exts = raw
      .split(/[,;]/)
      .map(s => s.trim().startsWith('.') ? s.trim() : `.${s.trim()}`)
      .filter(Boolean);
    if (exts.length > 0) {
      _cachedExtensions = exts;
      return exts;
    }
  }
  _cachedExtensions = DEFAULT_SESSION_EXTENSIONS;
  return DEFAULT_SESSION_EXTENSIONS;
}

/** 判断文件名是否匹配会话文件扩展名 */
export function isSessionFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return getSessionFileExtensions().some(ext => lower.endsWith(ext.toLowerCase()));
}

/** 去掉匹配的会话文件扩展名，返回不带后缀的文件名 */
export function stripSessionExt(filename: string): string {
  const lower = filename.toLowerCase();
  for (const ext of getSessionFileExtensions()) {
    if (lower.endsWith(ext.toLowerCase())) return filename.slice(0, -ext.length);
  }
  return filename;
}

/** 与运行中的 Gateway 使用同一状态目录时，可读会话；官方变量见 OPENCLAW_STATE_DIR */
function envOpenclawStateDirRoot(): string | null {
  const raw = process.env.OPENCLAW_STATE_DIR?.trim();
  if (!raw) return null;
  const homeDir = expandHome(raw);
  try {
    if (!fs.existsSync(homeDir) || !fs.statSync(homeDir).isDirectory()) return null;
  } catch {
    return null;
  }
  return homeDir;
}

/**
 * 返回可用于读取各代理 sessions 目录的数据根列表（去重、仅存在目录）。
 * 顺序：环境变量优先，再默认 ~/.openclaw、~/.zeroclaw 等。
 */
export function getLobsterDataRoots(): LobsterDataRoot[] {
  const seen = new Set<string>();
  const out: LobsterDataRoot[] = [];

  let envIdx = 0;
  for (const raw of envExtraRoots()) {
    const homeDir = expandHome(raw);
    const key = safeRealpath(homeDir);
    if (seen.has(key)) continue;
    if (!fs.existsSync(homeDir) || !fs.statSync(homeDir).isDirectory()) continue;
    seen.add(key);
    out.push({
      id: `env-${envIdx++}`,
      label: path.basename(homeDir) || 'custom',
      homeDir,
      agentsDir: path.join(homeDir, 'agents'),
    });
  }

  const stateEnv = envOpenclawStateDirRoot();
  if (stateEnv) {
    const key = safeRealpath(stateEnv);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({
        id: 'openclaw-state-env',
        label: 'OPENCLAW_STATE_DIR',
        homeDir: stateEnv,
        agentsDir: path.join(stateEnv, 'agents'),
      });
    }
  }

  for (const c of DEFAULT_SCAN) {
    const homeDir = path.join(os.homedir(), c.dirname);
    const key = safeRealpath(homeDir);
    if (seen.has(key)) continue;
    if (!fs.existsSync(homeDir) || !fs.statSync(homeDir).isDirectory()) continue;
    seen.add(key);
    out.push({
      id: c.id,
      label: c.label,
      homeDir,
      agentsDir: path.join(homeDir, 'agents'),
    });
  }

  return out;
}

/**
 * 模板、Skill 安装等「写入」时的主目录。
 * 顺序：CLAWCLIP_PRIMARY_LOBSTER_HOME → OPENCLAW_STATE_DIR（官方，与 Gateway 一致）→ 已探测根 → ~/.openclaw
 */
export function getPrimaryLobsterHome(): string {
  const primary = process.env.CLAWCLIP_PRIMARY_LOBSTER_HOME?.trim();
  if (primary) return expandHome(primary);
  const stateDir = process.env.OPENCLAW_STATE_DIR?.trim();
  if (stateDir) {
    const p = expandHome(stateDir);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return p;
    } catch {
      /* fall through */
    }
  }
  const roots = getLobsterDataRoots();
  if (roots.length > 0) return roots[0].homeDir;
  return path.join(os.homedir(), '.openclaw');
}

/**
 * 给 npx clawhub 等子进程：把技能装到「当前主数据根」，与 OpenClaw 文档一致。
 * 不覆盖调用方已在环境里设置的 OPENCLAW_STATE_DIR / OPENCLAW_CONFIG_PATH（官方约定：不强行覆盖）。
 */
export function getSpawnEnvWithOpenclawState(): NodeJS.ProcessEnv {
  const e = { ...process.env } as NodeJS.ProcessEnv;
  const resolved = path.resolve(getPrimaryLobsterHome());
  if (!process.env.OPENCLAW_STATE_DIR?.trim()) {
    e.OPENCLAW_STATE_DIR = resolved;
  }
  if (!process.env.OPENCLAW_CONFIG_PATH?.trim()) {
    const oc = path.join(resolved, 'openclaw.json');
    const zc = path.join(resolved, 'zeroclaw.json');
    if (fs.existsSync(oc)) e.OPENCLAW_CONFIG_PATH = oc;
    else if (fs.existsSync(zc)) e.OPENCLAW_CONFIG_PATH = zc;
  }
  return e;
}

/**
 * 虾片自身状态目录（预算、排行榜、导入会话等），与具体龙虾品牌解耦。
 * CLAWCLIP_STATE_DIR 可指向独立目录（如 Docker volume）。
 */
export function getClawclipStateDir(): string {
  const env = process.env.CLAWCLIP_STATE_DIR?.trim();
  if (env) {
    const p = expandHome(env);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  }
  const primary = getPrimaryLobsterHome();
  const cm = path.join(primary, 'cost-monitor');
  if (!fs.existsSync(cm)) fs.mkdirSync(cm, { recursive: true });
  return cm;
}

export interface AgentSessionsEntry {
  sourceId: string;
  agentName: string;
  sessionsDir: string;
}

/** 列出某数据根下所有「代理 → sessions 目录」映射（含扁平 ~/.xxx/sessions） */
export function listAgentSessionEntries(root: LobsterDataRoot): AgentSessionsEntry[] {
  const entries: AgentSessionsEntry[] = [];

  if (fs.existsSync(root.agentsDir) && fs.statSync(root.agentsDir).isDirectory()) {
    let agents: string[];
    try {
      agents = fs.readdirSync(root.agentsDir);
    } catch {
      return entries;
    }
    for (const agent of agents) {
      const agentPath = path.join(root.agentsDir, agent);
      let st: fs.Stats;
      try {
        st = fs.statSync(agentPath);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;
      const sessionsDir = path.join(agentPath, 'sessions');
      if (fs.existsSync(sessionsDir) && fs.statSync(sessionsDir).isDirectory()) {
        entries.push({ sourceId: root.id, agentName: agent, sessionsDir });
      }
    }
  }

  const flat = path.join(root.homeDir, 'sessions');
  if (fs.existsSync(flat) && fs.statSync(flat).isDirectory()) {
    entries.push({ sourceId: root.id, agentName: 'default', sessionsDir: flat });
  }

  return entries;
}

const MAX_JSONL_BYTES = 28 * 1024 * 1024;

/**
 * 统计各根下会话文件的数量（用于状态 API）。
 * 与「可解析为至少一步」的会话数口径不同，后者由 SessionParser 基于解析结果统计。
 */
export function countSessionJsonlFiles(): { total: number; byRoot: Record<string, number> } {
  const byRoot: Record<string, number> = {};
  let total = 0;
  for (const root of getLobsterDataRoots()) {
    let n = 0;
    for (const e of listAgentSessionEntries(root)) {
      let files: string[];
      try {
        files = fs.readdirSync(e.sessionsDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (isSessionFile(f)) n += 1;
      }
    }
    byRoot[root.id] = n;
    total += n;
  }
  return { total, byRoot };
}

export function readJsonlFileSafe(filePath: string): string | null {
  let st: fs.Stats;
  try {
    st = fs.statSync(filePath);
  } catch {
    return null;
  }
  if (!st.isFile() || st.size === 0) return null;
  if (st.size > MAX_JSONL_BYTES) return null;
  try {
    let buf = fs.readFileSync(filePath);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      buf = buf.subarray(3);
    }
    return buf.toString('utf-8');
  } catch {
    return null;
  }
}

export { MAX_JSONL_BYTES };
