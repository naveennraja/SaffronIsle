import { AlertTriangle, Info, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalloutType = 'tip' | 'warning' | 'info'

const styles: Record<
  CalloutType,
  { border: string; bg: string; icon: typeof Lightbulb; iconColor: string }
> = {
  tip: {
    border: 'border-emerald',
    bg: 'bg-emerald/5',
    icon: Lightbulb,
    iconColor: 'text-emerald',
  },
  warning: {
    border: 'border-saffron',
    bg: 'bg-saffron/5',
    icon: AlertTriangle,
    iconColor: 'text-saffron-dark',
  },
  info: {
    border: 'border-mist',
    bg: 'bg-mist',
    icon: Info,
    iconColor: 'text-gray-600',
  },
}

interface CalloutProps {
  type?: CalloutType
  children: React.ReactNode
}

export function Callout({ type = 'info', children }: CalloutProps) {
  const style = styles[type]
  const Icon = style.icon

  return (
    <aside
      className={cn(
        'my-6 flex gap-3 rounded-r-lg border-l-4 p-4',
        style.border,
        style.bg
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconColor)} aria-hidden />
      <div className="text-body text-gray-800 [&>p]:m-0">{children}</div>
    </aside>
  )
}
