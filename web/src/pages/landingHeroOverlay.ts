export interface LandingHeroOverlay {
  id: string
  labelKey: string
  valueKey: string
  positionClassName: string
}

const LANDING_HERO_OVERLAYS = [
  {
    id: 'benchmark',
    labelKey: 'nav.benchmark',
    valueKey: 'landing.hero.media.pill.score',
    positionClassName: 'bottom-5 right-5',
  },
] satisfies readonly LandingHeroOverlay[]

export function getLandingHeroOverlays(): LandingHeroOverlay[] {
  return LANDING_HERO_OVERLAYS.map(overlay => ({ ...overlay }))
}
