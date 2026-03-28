import { cn } from '../../lib/cn'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
  from?: string
  via?: string
  to?: string
  animate?: boolean
}

export default function GradientText({
  children,
  className,
  from = '#3b82c4',
  via = '#06b6d4',
  to = '#10b981',
  animate = true,
}: GradientTextProps) {
  return (
    <span
      className={cn(
        'bg-clip-text text-transparent',
        animate && 'animate-gradient-shift bg-[length:200%_200%]',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
      }}
    >
      {children}
    </span>
  )
}
