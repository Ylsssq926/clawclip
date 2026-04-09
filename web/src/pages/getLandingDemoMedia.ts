import type { Locale } from '../lib/i18n'

export interface LandingDemoMedia {
  src: string
  alt: string
}

const LANDING_DEMO_MEDIA: Record<'zh' | 'en' | 'default', LandingDemoMedia> = {
  zh: {
    src: '/landing/radar-animation-zh.gif',
    alt: '虾片（ClawClip）Demo 动图：回放、成绩单与成本视图联动演示',
  },
  en: {
    src: '/landing/radar-animation-en.gif',
    alt: 'ClawClip demo animation showing replay, scorecard, and cost views in motion',
  },
  default: {
    src: '/landing/radar-animation.gif',
    alt: 'ClawClip demo animation showing replay, scorecard, and cost views in motion',
  },
}

export function getLandingDemoMedia(locale: Locale): LandingDemoMedia {
  if (locale === 'zh') {
    return LANDING_DEMO_MEDIA.zh
  }

  if (locale === 'en') {
    return LANDING_DEMO_MEDIA.en
  }

  return LANDING_DEMO_MEDIA.default
}
