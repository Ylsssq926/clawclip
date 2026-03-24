import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type { LobsterDataRootStatus, OpenClawStatus, SkillInfo } from '../types/index.js';
import {
  countSessionJsonlFiles,
  getLobsterDataRoots,
  getPrimaryLobsterHome,
} from './agent-data-root.js';
import { sessionParser } from './session-parser.js';

const execFileAsync = promisify(execFile);

/** 校验 skill 名称，防止命令注入和路径穿越 */
function isValidSkillName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length > 0 && name.length < 100;
}

function firstExistingConfig(homeDir: string): string {
  const candidates = [
    path.join(homeDir, 'openclaw.json'),
    path.join(homeDir, 'zeroclaw.json'),
    path.join(homeDir, 'config.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

function readChannelsFromConfig(configPath: string): string[] {
  if (!configPath) return [];
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const ch = config.channels as Record<string, { enabled?: boolean }> | undefined;
    if (ch && typeof ch === 'object') {
      return Object.keys(ch).filter(k => ch[k]?.enabled);
    }
  } catch {
    // ignore
  }
  return [];
}

function countSkillDirs(skillsDir: string): number {
  if (!fs.existsSync(skillsDir)) return 0;
  try {
    return fs.readdirSync(skillsDir).filter(f => {
      try {
        return fs.statSync(path.join(skillsDir, f)).isDirectory();
      } catch {
        return false;
      }
    }).length;
  } catch {
    return 0;
  }
}

function collectRootStatuses(): LobsterDataRootStatus[] {
  const { byRoot } = countSessionJsonlFiles();
  const roots = getLobsterDataRoots();
  return roots.map(r => {
    const cfg = firstExistingConfig(r.homeDir);
    const skillsDir = path.join(r.homeDir, 'skills');
    return {
      id: r.id,
      label: r.label,
      homeDir: r.homeDir,
      sessionJsonlFiles: byRoot[r.id] ?? 0,
      hasConfig: Boolean(cfg),
      configPath: cfg,
      skillsCount: countSkillDirs(skillsDir),
    };
  });
}

export class OpenClawBridge {
  /** 获取运行状态与多根兼容信息 */
  async getStatus(): Promise<OpenClawStatus> {
    const dataRoots = collectRootStatuses();
    const counts = countSessionJsonlFiles();
    const hasRealSessionData = sessionParser.hasRealSessions();

    let cliCommand: 'openclaw' | 'zeroclaw' | null = null;
    let running = false;
    let version = 'unknown';

    for (const cmd of ['openclaw', 'zeroclaw'] as const) {
      try {
        const r = await execFileAsync(cmd, ['status', '--all'], { timeout: 5000 });
        const stdout = r.stdout || '';
        cliCommand = cmd;
        running = stdout.includes('running') || stdout.includes('Gateway') || stdout.includes('在线');
        const versionMatch = stdout.match(/version[:\s]+([^\s\n]+)/i);
        if (versionMatch) version = versionMatch[1]!;
        break;
      } catch {
        continue;
      }
    }

    let configPath = '';
    let channels: string[] = [];
    for (const r of dataRoots) {
      if (r.configPath) {
        configPath = r.configPath;
        channels = readChannelsFromConfig(r.configPath);
        break;
      }
    }
    if (!configPath) {
      const fallback = firstExistingConfig(getPrimaryLobsterHome());
      if (fallback) {
        configPath = fallback;
        channels = readChannelsFromConfig(fallback);
      }
    }

    const skills = await this.getInstalledSkills();
    const skillCount = skills.length;

    return {
      running,
      version,
      uptime: running ? '运行中' : '未运行',
      configPath,
      skillCount,
      channels,
      cliCommand,
      dataRoots,
      totalSessionFiles: counts.total,
      hasRealSessionData,
    };
  }

  /** 合并各数据根下 skills 目录（同名只保留首次出现的描述） */
  async getInstalledSkills(): Promise<SkillInfo[]> {
    const roots = getLobsterDataRoots();
    const homes =
      roots.length > 0 ? roots.map(r => r.homeDir) : [getPrimaryLobsterHome()];
    const seen = new Set<string>();
    const skills: SkillInfo[] = [];

    for (const home of homes) {
      const skillsDir = path.join(home, 'skills');
      if (!fs.existsSync(skillsDir)) continue;
      let entries: string[];
      try {
        entries = fs.readdirSync(skillsDir);
      } catch {
        continue;
      }
      for (const entry of entries) {
        const skillPath = path.join(skillsDir, entry);
        let isDir = false;
        try {
          isDir = fs.statSync(skillPath).isDirectory();
        } catch {
          continue;
        }
        if (!isDir) continue;
        if (seen.has(entry)) continue;
        seen.add(entry);

        const skillMd = path.join(skillPath, 'SKILL.md');
        let description = '';
        if (fs.existsSync(skillMd)) {
          try {
            const content = fs.readFileSync(skillMd, 'utf-8');
            const descMatch = content.match(/^#\s+(.+)/m);
            if (descMatch) description = descMatch[1]!;
          } catch {
            description = entry;
          }
        }

        skills.push({
          name: entry,
          description: description || entry,
          installed: true,
        });
      }
    }

    return skills;
  }

  /** 安装 Skill（写入主数据根，与 CLAWCLIP_PRIMARY_LOBSTER_HOME 一致） */
  async installSkill(name: string): Promise<{ success: boolean; message: string }> {
    if (!isValidSkillName(name)) {
      return { success: false, message: '无效的 Skill 名称，只允许字母、数字、下划线和连字符' };
    }
    try {
      await execFileAsync('npx', ['clawhub', 'install', name], { timeout: 30000 });
      return { success: true, message: `${name} 安装成功` };
    } catch (e) {
      return { success: false, message: `安装失败: ${e instanceof Error ? e.message : e}` };
    }
  }

  /** 卸载 Skill（仅从主数据根删除，避免误删多根副本） */
  async uninstallSkill(name: string): Promise<{ success: boolean; message: string }> {
    if (!isValidSkillName(name)) {
      return { success: false, message: '无效的 Skill 名称' };
    }

    const skillsDir = path.join(getPrimaryLobsterHome(), 'skills');
    const skillPath = path.join(skillsDir, name);
    const resolved = path.resolve(skillPath);
    if (!resolved.startsWith(path.resolve(skillsDir))) {
      return { success: false, message: '非法路径' };
    }

    if (!fs.existsSync(skillPath)) {
      return { success: false, message: `Skill ${name} 不存在` };
    }
    try {
      fs.rmSync(skillPath, { recursive: true });
      return { success: true, message: `${name} 已卸载` };
    } catch (e) {
      return { success: false, message: `卸载失败: ${e instanceof Error ? e.message : e}` };
    }
  }
}

export const openclawBridge = new OpenClawBridge();
