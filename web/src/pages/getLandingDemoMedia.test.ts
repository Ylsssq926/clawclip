import { describe, expect, it } from 'vitest'
import { getLandingDemoMedia } from './getLandingDemoMedia'

describe('getLandingDemoMedia', () => {
  it('为中文返回中文动图和替代文本', () => {
    expect(getLandingDemoMedia('zh')).toEqual({
      src: '/landing/radar-animation-zh.gif',
      alt: '虾片 Demo 动图：回放、成绩单与成本视图联动演示',
    })
  })

  it('为英文返回英文动图和替代文本', () => {
    expect(getLandingDemoMedia('en')).toEqual({
      src: '/landing/radar-animation-en.gif',
      alt: 'ClawClip demo animation showing replay, scorecard, and cost views in motion',
    })
  })

  it('为其他语言回退到通用动图', () => {
    expect(getLandingDemoMedia('ja')).toEqual({
      src: '/landing/radar-animation.gif',
      alt: 'ClawClip demo animation showing replay, scorecard, and cost views in motion',
    })
  })
})
