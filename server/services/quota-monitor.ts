/**
 * 免费额度监控服务
 * 检测各免费 API 的剩余额度，并提供切换推荐
 */

export interface QuotaSnapshot {
  provider: string
  model: string
  remaining: {
    requests?: number
    tokens?: number
  }
  limit: {
    requests?: number
    tokens?: number
  }
  percentage: number // 剩余百分比
  resetAt?: string // 重置时间
  checkedAt: string // 检测时间
  status: 'healthy' | 'low' | 'exhausted' | 'unknown'
}

export interface QuotaCheckResult {
  providers: QuotaSnapshot[]
  recommendation?: {
    action: 'switch' | 'none'
    reason: string
    reasonZh: string
    suggestedModel: string
    suggestedProvider: string
  }
}

interface RateLimitHeaders {
  limitRequests?: number
  limitTokens?: number
  remainingRequests?: number
  remainingTokens?: number
  resetRequests?: string
  resetTokens?: string
}

/**
 * 解析 rate limit 响应头
 */
function parseRateLimitHeaders(headers: Headers): RateLimitHeaders {
  const result: RateLimitHeaders = {}

  // 标准 rate limit 头
  const limitRequests = headers.get('x-ratelimit-limit-requests')
  const limitTokens = headers.get('x-ratelimit-limit-tokens')
  const remainingRequests = headers.get('x-ratelimit-remaining-requests')
  const remainingTokens = headers.get('x-ratelimit-remaining-tokens')
  const resetRequests = headers.get('x-ratelimit-reset-requests')
  const resetTokens = headers.get('x-ratelimit-reset-tokens')

  if (limitRequests) result.limitRequests = parseInt(limitRequests, 10)
  if (limitTokens) result.limitTokens = parseInt(limitTokens, 10)
  if (remainingRequests) result.remainingRequests = parseInt(remainingRequests, 10)
  if (remainingTokens) result.remainingTokens = parseInt(remainingTokens, 10)
  if (resetRequests) result.resetRequests = resetRequests
  if (resetTokens) result.resetTokens = resetTokens

  return result
}

/**
 * 计算剩余百分比
 */
function calculatePercentage(remaining: number, limit: number): number {
  if (limit === 0) return 0
  return Math.round((remaining / limit) * 100)
}

/**
 * 根据百分比判断状态
 */
export function classifyQuotaStatus(percentage: number): QuotaSnapshot['status'] {
  if (percentage > 50) return 'healthy'
  if (percentage > 0) return 'low'
  return 'exhausted'
}

function getStatus(percentage: number): QuotaSnapshot['status'] {
  return classifyQuotaStatus(percentage)
}

/**
 * 检测 OpenRouter 额度
 */
export async function checkOpenRouter(apiKey: string): Promise<QuotaSnapshot> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.status}`)
    }

    const data = await res.json()
    
    // OpenRouter 返回格式：{ data: { limit: number, usage: number, ... } }
    const limit = data.data?.limit || 0
    const usage = data.data?.usage || 0
    const remaining = Math.max(0, limit - usage)
    const percentage = calculatePercentage(remaining, limit)

    return {
      provider: 'OpenRouter',
      model: 'various',
      remaining: { requests: remaining },
      limit: { requests: limit },
      percentage,
      checkedAt: new Date().toISOString(),
      status: getStatus(percentage),
    }
  } catch (error) {
    return {
      provider: 'OpenRouter',
      model: 'various',
      remaining: {},
      limit: {},
      percentage: 0,
      checkedAt: new Date().toISOString(),
      status: 'unknown',
    }
  }
}

/**
 * 检测 Groq 额度
 */
export async function checkGroq(apiKey: string): Promise<QuotaSnapshot> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    })

    const rateLimits = parseRateLimitHeaders(res.headers)

    // 优先使用 requests 限制
    let percentage = 0
    let status: QuotaSnapshot['status'] = 'unknown'

    if (
      rateLimits.remainingRequests !== undefined &&
      rateLimits.limitRequests !== undefined &&
      rateLimits.limitRequests > 0
    ) {
      percentage = calculatePercentage(rateLimits.remainingRequests, rateLimits.limitRequests)
      status = getStatus(percentage)
    }

    return {
      provider: 'Groq',
      model: 'llama-3.1-8b-instant',
      remaining: {
        requests: rateLimits.remainingRequests,
        tokens: rateLimits.remainingTokens,
      },
      limit: {
        requests: rateLimits.limitRequests,
        tokens: rateLimits.limitTokens,
      },
      percentage,
      resetAt: rateLimits.resetRequests,
      checkedAt: new Date().toISOString(),
      status,
    }
  } catch (error) {
    return {
      provider: 'Groq',
      model: 'llama-3.1-8b-instant',
      remaining: {},
      limit: {},
      percentage: 0,
      checkedAt: new Date().toISOString(),
      status: 'unknown',
    }
  }
}

/**
 * 检测 Cerebras 额度
 */
export async function checkCerebras(apiKey: string): Promise<QuotaSnapshot> {
  try {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    })

    const rateLimits = parseRateLimitHeaders(res.headers)

    let percentage = 0
    let status: QuotaSnapshot['status'] = 'unknown'

    if (
      rateLimits.remainingRequests !== undefined &&
      rateLimits.limitRequests !== undefined &&
      rateLimits.limitRequests > 0
    ) {
      percentage = calculatePercentage(rateLimits.remainingRequests, rateLimits.limitRequests)
      status = getStatus(percentage)
    }

    return {
      provider: 'Cerebras',
      model: 'llama3.1-8b',
      remaining: {
        requests: rateLimits.remainingRequests,
        tokens: rateLimits.remainingTokens,
      },
      limit: {
        requests: rateLimits.limitRequests,
        tokens: rateLimits.limitTokens,
      },
      percentage,
      resetAt: rateLimits.resetRequests,
      checkedAt: new Date().toISOString(),
      status,
    }
  } catch (error) {
    return {
      provider: 'Cerebras',
      model: 'llama3.1-8b',
      remaining: {},
      limit: {},
      percentage: 0,
      checkedAt: new Date().toISOString(),
      status: 'unknown',
    }
  }
}

/**
 * 检测所有配置的免费 provider
 */
export async function checkAllQuotas(): Promise<QuotaCheckResult> {
  const providers: QuotaSnapshot[] = []

  // 从环境变量读取 API keys
  const groqKey = process.env.GROQ_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const cerebrasKey = process.env.CEREBRAS_API_KEY

  // 并行检测所有 provider
  const checks: Promise<QuotaSnapshot>[] = []

  if (groqKey) {
    checks.push(checkGroq(groqKey))
  }

  if (openrouterKey) {
    checks.push(checkOpenRouter(openrouterKey))
  }

  if (cerebrasKey) {
    checks.push(checkCerebras(cerebrasKey))
  }

  if (checks.length > 0) {
    const results = await Promise.all(checks)
    providers.push(...results.filter((r) => r.status !== 'unknown'))
  }

  // 生成推荐
  const recommendation = generateQuotaRecommendation(providers)

  return {
    providers,
    recommendation,
  }
}

/**
 * 生成切换推荐
 */
export function generateQuotaRecommendation(
  providers: QuotaSnapshot[],
): QuotaCheckResult['recommendation'] {
  if (providers.length === 0) {
    return undefined
  }

  // 找出剩余额度最多的 provider
  const bestProvider = providers.reduce((best, current) => {
    return current.percentage > best.percentage ? current : best
  })

  // 找出剩余额度最少的 provider
  const worstProvider = providers.reduce((worst, current) => {
    return current.percentage < worst.percentage ? current : worst
  })

  // 如果所有 provider 都快用完，推荐切换到 DeepSeek
  const allLow = providers.every((p) => p.percentage < 20)
  if (allLow) {
    return {
      action: 'switch',
      reason: 'All free providers are running low. Consider switching to DeepSeek (paid but very cheap).',
      reasonZh: '所有免费 provider 额度都快用完了，建议切换到 DeepSeek（付费但非常便宜）。',
      suggestedModel: 'deepseek-chat',
      suggestedProvider: 'DeepSeek',
    }
  }

  // 如果最差的 provider 剩余额度 < 20%，推荐切换
  if (worstProvider.percentage < 20 && bestProvider.percentage > worstProvider.percentage) {
    return {
      action: 'switch',
      reason: `${worstProvider.provider} is running low (${worstProvider.percentage}% remaining). Consider switching to ${bestProvider.provider} (${bestProvider.percentage}% remaining).`,
      reasonZh: `${worstProvider.provider} 额度即将用完（剩余 ${worstProvider.percentage}%），建议切换到 ${bestProvider.provider}（剩余 ${bestProvider.percentage}%）。`,
      suggestedModel: bestProvider.model,
      suggestedProvider: bestProvider.provider,
    }
  }

  return undefined
}
