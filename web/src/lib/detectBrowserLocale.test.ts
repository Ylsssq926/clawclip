import { describe, expect, it } from 'vitest'
import { detectBrowserLocale } from './detectBrowserLocale'

describe('detectBrowserLocale', () => {
  it('把 zh-CN 识别为中文', () => {
    expect(detectBrowserLocale(['zh-CN'])).toBe('zh')
  })

  it('按浏览器优先级匹配日语', () => {
    expect(detectBrowserLocale(['ja-JP', 'en'])).toBe('ja')
  })

  it('把不支持的语言回退到英文', () => {
    expect(detectBrowserLocale(['pt-BR', 'en'])).toBe('en')
  })

  it('按顺序选择第一个支持的语言', () => {
    expect(detectBrowserLocale(['fr-FR', 'de'])).toBe('fr')
  })

  it('在没有浏览器语言时默认英文', () => {
    expect(detectBrowserLocale([])).toBe('en')
  })
})
