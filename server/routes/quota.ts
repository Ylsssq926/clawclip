import { Router } from 'express'
import { checkAllQuotas } from '../services/quota-monitor.js'

const router = Router()
const CACHE_MS = 5 * 60 * 1000
let quotaCache: { at: number; data: Awaited<ReturnType<typeof checkAllQuotas>> } | null = null

/**
 * GET /api/quota/status
 * 返回所有已配置的免费 provider 的额度状态
 */
router.get('/status', async (req, res) => {
  try {
    const refresh = String(req.query.refresh ?? '').toLowerCase() === 'true'
    const now = Date.now()
    if (!refresh && quotaCache && now - quotaCache.at < CACHE_MS) {
      res.json({ ...quotaCache.data, cached: true })
      return
    }

    const result = await checkAllQuotas()
    quotaCache = { at: now, data: result }
    res.json({ ...result, cached: false })
  } catch (error) {
    console.error('Error checking quota status:', error)
    res.status(500).json({
      error: '检查额度状态失败 / Failed to check quota status',
      providers: [],
    })
  }
})

export default router
