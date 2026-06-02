import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: undefined
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
  disabled?: boolean
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string
  external?: boolean
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald text-white shadow-soft hover:bg-emerald-dark hover:shadow-card',
  secondary:
    'bg-forest text-cream shadow-soft hover:bg-forest-light',
  outline:
    'border border-emerald/30 bg-white text-emerald-dark shadow-soft hover:border-emerald hover:bg-emerald-light/50',
  ghost: 'bg-transparent text-forest hover:bg-mist',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-4 py-2 text-small',
  md: 'min-h-[44px] px-6 py-2.5 text-body',
  lg: 'min-h-[48px] px-8 py-3 text-body font-medium',
}

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
  } = props

  const classes = cn(
    'inline-flex items-center justify-center rounded-xl font-sans font-medium no-underline transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
    variants[variant],
    sizes[size],
    className
  )

  if ('href' in props && props.href) {
    if (props.external) {
      return (
        <a
          href={props.href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    }
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    )
  }

  const { type = 'button', onClick, disabled } = props as ButtonAsButton
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(classes, disabled && 'cursor-not-allowed opacity-50')}
    >
      {children}
    </button>
  )
}
