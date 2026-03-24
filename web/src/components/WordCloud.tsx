import { useMemo } from 'react'

export interface KeywordItem {
  word: string
  count: number
  category: 'tool' | 'topic' | 'model' | 'action' | 'other'
}

export interface WordCloudProps {
  keywords: KeywordItem[]
  onWordClick?: (word: string) => void
  width?: number
  height?: number
}

const CATEGORY_FILL: Record<KeywordItem['category'], string> = {
  tool: '#f97316',
  topic: '#3b82f6',
  model: '#22c55e',
  action: '#a855f7',
  other: '#94a3b8',
}

type BBox = { left: number; top: number; right: number; bottom: number }

function rectsOverlap(a: BBox, b: BBox): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function anyOverlap(box: BBox, boxes: BBox[]): boolean {
  for (const b of boxes) {
    if (rectsOverlap(box, b)) return true
  }
  return false
}

export default function WordCloud({
  keywords,
  onWordClick,
  width = 800,
  height = 360,
}: WordCloudProps) {
  const placed = useMemo(() => {
    if (!keywords.length) return [] as Array<{
      word: string
      x: number
      y: number
      fontSize: number
      fill: string
    }>

    const sorted = [...keywords].sort((a, b) => b.count - a.count)
    const counts = sorted.map(k => k.count)
    const minC = Math.min(...counts)
    const maxC = Math.max(...counts)
    const fontSizeFor = (c: number) => {
      if (maxC === minC) return (14 + 48) / 2
      return 14 + ((c - minC) / (maxC - minC)) * (48 - 14)
    }

    const cx = width / 2
    const cy = height / 2
    const spiralA = 4
    const margin = 4
    const maxSteps = 4000
    const boxes: BBox[] = []
    const out: Array<{ word: string; x: number; y: number; fontSize: number; fill: string }> = []

    for (const kw of sorted) {
      const fontSize = fontSizeFor(kw.count)
      const tw = kw.word.length * fontSize * 0.6
      const th = fontSize * 1.2
      const fill = CATEGORY_FILL[kw.category] ?? CATEGORY_FILL.other

      let theta = 0
      let found = false

      for (let strict = 1; strict >= 0 && !found; strict--) {
        theta = 0
        for (let step = 0; step < maxSteps; step++) {
          const r = spiralA * theta
          const x = cx + r * Math.cos(theta)
          const y = cy + r * Math.sin(theta)
          const left = x - tw / 2
          const top = y - th / 2
          const right = x + tw / 2
          const bottom = y + th / 2
          const box: BBox = { left, top, right, bottom }

          const inside =
            left >= margin &&
            top >= margin &&
            right <= width - margin &&
            bottom <= height - margin

          if ((strict === 1 ? inside : true) && !anyOverlap(box, boxes)) {
            out.push({ word: kw.word, x, y, fontSize, fill })
            boxes.push(box)
            found = true
            break
          }
          theta += 0.5
        }
      }
    }

    return out
  }, [keywords, width, height])

  if (!keywords.length) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-500">
        暂无关键词数据
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto max-h-[420px] select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="关键词词云"
    >
      {placed.map((p, i) => (
        <text
          key={`${p.word}-${i}`}
          x={p.x}
          y={p.y}
          fontSize={p.fontSize}
          fill={p.fill}
          textAnchor="middle"
          dominantBaseline="middle"
          className="cursor-pointer transition-opacity duration-150 hover:opacity-70"
          style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
          onClick={() => onWordClick?.(p.word)}
        >
          {p.word}
        </text>
      ))}
    </svg>
  )
}
