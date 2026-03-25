import * as fs from 'fs';
import * as path from 'path';
import type { TemplateInfo } from '../types/index.js';
import { getPrimaryLobsterHome } from './agent-data-root.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 从当前文件位置推算：server/services/ → server/ → 项目根/
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function getTemplatesDir(): string {
  // 优先从项目根目录找
  const fromRoot = path.join(PROJECT_ROOT, 'templates');
  if (fs.existsSync(fromRoot)) return fromRoot;
  // 兜底：从 cwd 找
  const fromCwd = path.join(process.cwd(), 'templates');
  if (fs.existsSync(fromCwd)) return fromCwd;
  return fromRoot;
}

export class TemplateEngine {
  private static VALID_ID = /^[a-zA-Z0-9_-]+$/;

  /** 获取所有可用模板 */
  getTemplates(): TemplateInfo[] {
    const dir = getTemplatesDir();
    const indexPath = path.join(dir, 'index.json');
    if (!fs.existsSync(indexPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /** 获取单个模板详情 */
  getTemplate(id: string): TemplateInfo | null {
    if (!TemplateEngine.VALID_ID.test(id)) return null;
    const templates = this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /** 应用模板：将模板的 SKILL.md 复制到 OpenClaw skills 目录 */
  applyTemplate(id: string): { success: boolean; message: string } {
    if (!TemplateEngine.VALID_ID.test(id)) {
      return { success: false, message: '无效的模板 ID' };
    }
    const template = this.getTemplate(id);
    if (!template) {
      return { success: false, message: `模板 ${id} 不存在` };
    }

    const dir = getTemplatesDir();
    const templateDir = path.join(dir, id);
    const skillMd = path.join(templateDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) {
      return { success: false, message: `模板 ${id} 缺少 SKILL.md` };
    }

    const targetDir = path.join(getPrimaryLobsterHome(), 'skills', id);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(skillMd, path.join(targetDir, 'SKILL.md'));
      return { success: true, message: `模板「${template.name}」已导入` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('EACCES') || msg.includes('EPERM')) {
        return { success: false, message: `导入失败：没有写入权限。请检查 ${targetDir} 目录权限。` };
      }
      return { success: false, message: `导入失败: ${msg}` };
    }
  }
}

export const templateEngine = new TemplateEngine();
