import { cn } from '@/lib/utils'
import type { CategoryColor } from '@/lib/categories'

const colorClasses: Record<CategoryColor, string> = {
  emerald: 'bg-emerald/10 text-emerald-dark',
  saffron: 'bg-saffron/10 text-saffron-dark',
  gold: 'bg-gold/20 text-amber-800',
  forest: 'bg-forest/10 text-forest',
  mist: 'bg-mist text-gray-600',
}

interface BadgeProps {
  label: string
  color?: CategoryColor
  className?: string
}

export function Badge({ label, color = 'emerald', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-1 text-label font-medium uppercase tracking-widest',
        colorClasses[color],
        className
      )}
    >
      {label}
    </span>
  )
}
