import { Router, type Response } from 'express';
import { openclawBridge } from '../services/openclaw-bridge.js';

const router = Router();

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function hintForSkills(err: unknown, op: 'list' | 'install' | 'uninstall'): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('eacces') || msg.includes('eperm') || msg.includes('permission')) {
    return '请检查 skills 目录与虾片数据根目录的读写权限。/ Check read/write permissions for the skills folder and ClawClip data root.';
  }
  if (msg.includes('enoent') || msg.includes('not found') || msg.includes('spawn')) {
    if (op === 'install') {
      return '请确认已安装 Node.js，且 npx 可用；安装 Skill 依赖 clawhub。/ Ensure Node.js and npx work; skill install uses clawhub.';
    }
    return '请确认 OpenClaw 数据目录存在且可访问。/ Ensure the OpenClaw data directory exists and is accessible.';
  }
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return '操作超时，请检查网络后重试。/ Operation timed out; check network and retry.';
  }
  return '请稍后重试；若持续失败请查看服务端日志。/ Try again; check server logs if it persists.';
}

function sendSkillError(
  res: Response,
  err: unknown,
  bilingual: string,
  code: string,
  op: 'list' | 'install' | 'uninstall',
): void {
  const payload: Record<string, unknown> = {
    error: bilingual,
    code,
    hint: hintForSkills(err, op),
  };
  if (isDev() && err != null) {
    payload.detail = err instanceof Error ? err.message : String(err);
  }
  res.status(500).json(payload);
}

/** 已安装 Skill 列表 */
router.get('/', async (_req, res) => {
  try {
    const skills = await openclawBridge.getInstalledSkills();
    res.json(skills);
  } catch (e) {
    sendSkillError(res, e, '获取 Skill 列表失败 / Failed to get skills', 'SKILLS_LIST_FAILED', 'list');
  }
});

/** 安装 Skill */
router.post('/install', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: '缺少 name 参数 / Missing name parameter' });
    return;
  }
  try {
    const result = await openclawBridge.installSkill(name.trim());
    res.json(result);
  } catch (e) {
    sendSkillError(res, e, '安装 Skill 失败 / Failed to install skill', 'SKILLS_INSTALL_FAILED', 'install');
  }
});

/** 卸载 Skill */
router.post('/uninstall', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: '缺少 name 参数 / Missing name parameter' });
    return;
  }
  try {
    const result = await openclawBridge.uninstallSkill(name.trim());
    res.json(result);
  } catch (e) {
    sendSkillError(res, e, '卸载 Skill 失败 / Failed to uninstall skill', 'SKILLS_UNINSTALL_FAILED', 'uninstall');
  }
});

export default router;
