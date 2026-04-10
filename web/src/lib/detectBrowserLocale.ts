import type { Locale } from './i18n'

function matchesLocaleTag(candidate: string, baseLocale: string) {
  return candidate === baseLocale || candidate.startsWith(`${baseLocale}-`)
}

export function detectBrowserLocale(navigatorLanguages: string[]): Locale {
  for (const rawLanguage of navigatorLanguages) {
    const language = rawLanguage.trim().toLowerCase()

    if (matchesLocaleTag(language, 'zh')) return 'zh'
    if (matchesLocaleTag(language, 'ja')) return 'ja'
    if (matchesLocaleTag(language, 'ko')) return 'ko'
    if (matchesLocaleTag(language, 'es')) return 'es'
    if (matchesLocaleTag(language, 'fr')) return 'fr'
    if (matchesLocaleTag(language, 'de')) return 'de'
    if (matchesLocaleTag(language, 'en')) return 'en'
  }

  return 'en'
}
