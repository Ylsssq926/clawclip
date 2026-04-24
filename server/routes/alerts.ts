import { Router } from 'express';
import { alertManager } from '../services/alert-manager.js';

const router = Router();

type AlertConfigUpdate = {
  webhookUrl?: string;
  enabled?: boolean;
  rules?: {
    budgetExceed?: boolean;
    highCostSession?: boolean;
    highCostThreshold?: number;
  };
};

type PersistedAlertConfigUpdate = {
  webhookUrl?: string;
  enabled?: boolean;
  rules?: {
    budgetExceed: boolean;
    highCostSession: boolean;
    highCostThreshold: number;
  };
};

const MAX_HIGH_COST_THRESHOLD = 1_000_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function validateAlertConfigUpdate(body: unknown): { value?: AlertConfigUpdate; error?: string } {
  if (!isPlainObject(body)) {
    return { error: '请求体必须是 JSON 对象 / Request body must be a JSON object' };
  }

  const next: AlertConfigUpdate = {};

  if ('webhookUrl' in body) {
    if (typeof body.webhookUrl !== 'string') {
      return { error: 'webhookUrl 必须是字符串 / webhookUrl must be a string' };
    }
    const webhookUrl = body.webhookUrl.trim();
    if (webhookUrl) {
      let parsed: URL;
      try {
        parsed = new URL(webhookUrl);
      } catch {
        return { error: 'webhookUrl 必须是合法 URL / webhookUrl must be a valid URL' };
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { error: 'webhookUrl 仅支持 http/https / webhookUrl must use http or https' };
      }
    }
    next.webhookUrl = webhookUrl;
  }

  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') {
      return { error: 'enabled 必须是布尔值 / enabled must be a boolean' };
    }
    next.enabled = body.enabled;
  }

  if ('rules' in body) {
    if (!isPlainObject(body.rules)) {
      return { error: 'rules 必须是对象 / rules must be an object' };
    }
    const rules: NonNullable<AlertConfigUpdate['rules']> = {};

    if ('budgetExceed' in body.rules) {
      if (typeof body.rules.budgetExceed !== 'boolean') {
        return { error: 'rules.budgetExceed 必须是布尔值 / rules.budgetExceed must be a boolean' };
      }
      rules.budgetExceed = body.rules.budgetExceed;
    }

    if ('highCostSession' in body.rules) {
      if (typeof body.rules.highCostSession !== 'boolean') {
        return { error: 'rules.highCostSession 必须是布尔值 / rules.highCostSession must be a boolean' };
      }
      rules.highCostSession = body.rules.highCostSession;
    }

    if ('highCostThreshold' in body.rules) {
      const threshold = body.rules.highCostThreshold;
      if (typeof threshold !== 'number' || !Number.isFinite(threshold)) {
        return { error: 'rules.highCostThreshold 必须是数字 / rules.highCostThreshold must be a number' };
      }
      if (threshold < 0 || threshold > MAX_HIGH_COST_THRESHOLD) {
        return {
          error: `rules.highCostThreshold 必须在 0-${MAX_HIGH_COST_THRESHOLD} 之间 / rules.highCostThreshold must be between 0 and ${MAX_HIGH_COST_THRESHOLD}`,
        };
      }
      rules.highCostThreshold = threshold;
    }

    next.rules = rules;
  }

  return { value: next };
}

/** GET /api/alerts/config */
router.get('/config', (_req, res) => {
  const config = alertManager.getConfig();
  res.json(config);
});

/** POST /api/alerts/config */
router.post('/config', (req, res) => {
  try {
    // 先白名单化并校验输入，避免把任意 req.body 直接持久化到本地告警配置。
    const { value, error } = validateAlertConfigUpdate(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const { rules, ...rest } = value ?? {};
    const payload: PersistedAlertConfigUpdate =
      rules != null ? { ...rest, rules: { ...alertManager.getConfig().rules, ...rules } } : rest;
    
    // 校验：如果 enabled 为 true，webhookUrl 不能为空
    const finalEnabled = payload.enabled ?? alertManager.getConfig().enabled;
    const finalWebhookUrl = payload.webhookUrl ?? alertManager.getConfig().webhookUrl;
    if (finalEnabled && !finalWebhookUrl.trim()) {
      res.status(400).json({ error: '启用告警时 webhookUrl 不能为空 / webhookUrl cannot be empty when alerts are enabled' });
      return;
    }
    
    const saved = alertManager.saveConfig(payload);
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: '保存配置失败 / Failed to save config', detail: String(e) });
  }
});

/** GET /api/alerts/history?limit=50 */
router.get('/history', (req, res) => {
  const rawLimit = req.query.limit;
  const limit = rawLimit ? Math.min(Math.max(parseInt(String(rawLimit), 10) || 50, 1), 200) : 50;
  res.json(alertManager.getHistory(limit));
});

/** POST /api/alerts/test — 发送测试告警 */
router.post('/test', async (_req, res) => {
  try {
    const ok = await alertManager.sendAlert('test', 'This is a test alert from ClawClip.');
    res.json({ delivered: ok });
  } catch (e) {
    res.status(500).json({ error: '发送失败 / Failed to send', detail: String(e) });
  }
});

export default router;
