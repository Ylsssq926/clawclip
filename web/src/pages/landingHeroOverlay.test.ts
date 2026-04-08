import { describe, expect, it } from 'vitest'
import { getLandingHeroOverlays } from './landingHeroOverlay'

describe('getLandingHeroOverlays', () => {
  it('只返回一个轻量且固定位置的 hero overlay 项', () => {
    const overlays = getLandingHeroOverlays()

    expect(overlays).toHaveLength(1)
    expect(overlays[0]).toMatchObject({
      id: 'benchmark',
      labelKey: 'nav.benchmark',
      valueKey: 'landing.hero.media.pill.score',
      positionClassName: expect.stringContaining('bottom-5'),
    })
  })
})
