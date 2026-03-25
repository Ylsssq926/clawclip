import { Router, type Response } from 'express';
import { openclawBridge } from '../services/openclaw-bridge.js';

const router = Router();

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function hintForStatus(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('eacces') || msg.includes('eperm') || msg.includes('permission')) {
    return '请检查虾片数据目录与配置路径的读写权限。/ Check read/write permissions for ClawClip data and config paths.';
  }
  if (msg.includes('enoent') || msg.includes('not found') || msg.includes('spawn')) {
    return '请确认已安装 OpenClaw CLI，且命令在 PATH 中可用。/ Install OpenClaw CLI and ensure it is on PATH.';
  }
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return '状态查询超时，请稍后重试。/ Status check timed out; try again.';
  }
  return '请稍后重试；若持续失败请查看服务端日志。/ Try again; check server logs if it persists.';
}

function sendStatusError(res: Response, err: unknown): void {
  const payload: Record<string, unknown> = {
    error: '获取状态失败 / Failed to get status',
    code: 'STATUS_FETCH_FAILED',
    hint: hintForStatus(err),
  };
  if (isDev() && err != null) {
    payload.detail = err instanceof Error ? err.message : String(err);
  }
  res.status(500).json(payload);
}

router.get('/', async (_req, res) => {
  try {
    const status = await openclawBridge.getStatus();
    res.json(status);
  } catch (e) {
    sendStatusError(res, e);
  }
});

export default router;
