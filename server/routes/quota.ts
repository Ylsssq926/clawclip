import { Router } from 'express'
import { checkAllQuotas } from '../services/quota-monitor.js'

const router = Router()

/**
 * GET /api/quota/status
 * 返回所有已配置的免费 provider 的额度状态
 */
router.get('/status', async (_req, res) => {
  try {
    const result = await checkAllQuotas()
    res.json(result)
  } catch (error) {
    console.error('Error checking quota status:', error)
    res.status(500).json({
      error: '检查额度状态失败 / Failed to check quota status',
      providers: [],
    })
  }
})

export default router
