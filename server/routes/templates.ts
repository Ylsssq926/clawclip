import { Router, type Response } from 'express';
import { templateEngine } from '../services/template-engine.js';

const router = Router();

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function hintForTemplates(err: unknown, op: 'list' | 'detail' | 'apply'): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('eacces') || msg.includes('eperm') || msg.includes('permission')) {
    return '请检查项目 templates 目录与虾片 skills 目录的读写权限。/ Check read/write permissions for templates and the ClawClip skills folder.';
  }
  if (msg.includes('enoent') || msg.includes('not found')) {
    return op === 'apply'
      ? '请确认模板资源完整，且虾片数据目录存在。/ Ensure template files exist and ClawClip data home is set.'
      : '请确认 templates 目录与 index.json 存在。/ Ensure the templates folder and index.json exist.';
  }
  if (msg.includes('timeout') || msg.includes('etimedout')) {
    return '操作超时，请稍后重试。/ Operation timed out; try again.';
  }
  return '请稍后重试；若持续失败请查看服务端日志。/ Try again; check server logs if it persists.';
}

function sendTemplateError(
  res: Response,
  err: unknown,
  bilingual: string,
  code: string,
  op: 'list' | 'detail' | 'apply',
): void {
  const payload: Record<string, unknown> = {
    error: bilingual,
    code,
    hint: hintForTemplates(err, op),
  };
  if (isDev() && err != null) {
    payload.detail = err instanceof Error ? err.message : String(err);
  }
  res.status(500).json(payload);
}

/** 模板列表 */
router.get('/', (_req, res) => {
  try {
    const templates = templateEngine.getTemplates();
    res.json(templates);
  } catch (e) {
    sendTemplateError(res, e, '获取模板列表失败 / Failed to get templates', 'TEMPLATES_LIST_FAILED', 'list');
  }
});

/** 模板详情 */
router.get('/:id', (req, res) => {
  try {
    const template = templateEngine.getTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: '模板不存在 / Template not found', code: 'TEMPLATE_NOT_FOUND' });
      return;
    }
    res.json(template);
  } catch (e) {
    sendTemplateError(
      res,
      e,
      '获取模板详情失败 / Failed to get template details',
      'TEMPLATE_DETAIL_FAILED',
      'detail',
    );
  }
});

/** 应用模板 */
router.post('/apply', (req, res) => {
  const { id } = req.body;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: '缺少 id 参数 / Missing id parameter' });
    return;
  }
  try {
    const result = templateEngine.applyTemplate(id.trim());
    res.json(result);
  } catch (e) {
    sendTemplateError(res, e, '应用模板失败 / Failed to apply template', 'TEMPLATE_APPLY_FAILED', 'apply');
  }
});

export default router;
