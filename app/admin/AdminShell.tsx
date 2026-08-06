import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Chrome for the admin screens.
 *
 * /admin renders outside the public site's layout, so it has no navbar and no
 * footer of its own — without something here it reads as a form floating on a
 * blank page. These pieces give it the parts a tool is expected to have: a bar
 * that says where you are and how to leave, cards with labelled headers, and
 * one set of field styles so every control lines up and focuses the same way.
 *
 * The palette is the site's, not a second one: cream ground, white cards,
 * forest text, saffron for the action and emerald for success. Nothing here
 * introduces a colour the public pages do not already use.
 */

type AdminShellProps = {
  children: ReactNode
  /** 'sm' for the password gate, 'xl' for the two-column publish form. */
  maxWidth?: 'sm' | 'lg' | 'xl'
  /** Rendered full-width in a sticky bar above the content. */
  topBar?: ReactNode
  /** Centres the content vertically — right for the short sign-in card only. */
  center?: boolean
}

const widthClass = {
  sm: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const

export default function AdminShell({
  children,
  maxWidth = 'lg',
  topBar,
  center = false,
}: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      {topBar}
      {/* items-start once the content is taller than the viewport: centring a
          long form pushes its heading off the top of the screen. */}
      <main
        className={cn(
          'flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-10',
          center ? 'items-center' : 'items-start'
        )}
      >
        <div className={cn('w-full', widthClass[maxWidth])}>{children}</div>
      </main>
    </div>
  )
}

/**
 * The bar across the top: where you are on the left, what you can do on the
 * right. Sticky, because the publish form scrolls well past it and signing out
 * should not require scrolling back.
 */
export function AdminTopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-mist/60 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-16">
        <div className="flex items-center gap-2.5">
          <AdminMark />
          <div className="leading-tight">
            <span className="block font-serif text-sm text-forest sm:text-base">
              Saffron Isle
            </span>
            <span className="block text-label uppercase text-gray-400">Admin</span>
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}

/** The site's initial in a saffron tile — a mark, so the bar is not text alone. */
export function AdminMark({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-saffron font-serif text-white shadow-soft',
        size === 'lg' ? 'h-12 w-12 text-xl' : 'h-8 w-8 text-sm'
      )}
      aria-hidden
    >
      S
    </span>
  )
}

/**
 * One titled card. The publish form is a grid of these.
 *
 * `description` earns its place on the sections whose purpose is not obvious
 * from a two-word heading — it is the difference between "Publishing" and
 * knowing that leaving the date blank publishes immediately.
 */
export function AdminSection({
  title,
  description,
  icon,
  children,
  className = '',
  tone = 'default',
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  children: ReactNode
  className?: string
  /** 'notice' for the amber replace/warning cards. */
  tone?: 'default' | 'notice'
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border shadow-soft',
        tone === 'notice'
          ? 'border-saffron/40 bg-saffron/[0.06]'
          : 'border-mist/70 bg-white',
        className
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 border-b px-5 py-4 sm:px-6',
          tone === 'notice' ? 'border-saffron/20' : 'border-mist/60 bg-cream/40'
        )}
      >
        {icon && (
          <span
            className={cn(
              'mt-0.5 shrink-0',
              tone === 'notice' ? 'text-saffron-dark' : 'text-emerald'
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-serif text-base text-forest sm:text-lg">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}

/**
 * Label, control and optional hint, so every field lines up the same way.
 *
 * `counter` sits on the label row rather than inside the hint: a character
 * count is a live reading of the field, and buried at the end of two sentences
 * of explanation it goes unread until it is already too long.
 */
export function AdminField({
  label,
  hint,
  optional,
  required,
  counter,
  children,
}: {
  label: string
  hint?: ReactNode
  optional?: string
  required?: boolean
  counter?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-forest">
          {label}
          {required && (
            <span className="text-saffron-dark" title="Required">
              {' '}
              *
            </span>
          )}
          {optional && (
            <span className="font-normal text-gray-400"> — {optional}</span>
          )}
        </label>
        {counter}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{hint}</p>}
    </div>
  )
}

/** Live character count that turns amber as it approaches the limit, red past it. */
export function AdminCounter({ length, limit }: { length: number; limit: number }) {
  if (length === 0) return null
  const over = length > limit
  const near = !over && length > limit * 0.85
  return (
    <span
      className={cn(
        'shrink-0 tabular-nums text-xs',
        over ? 'font-medium text-red-500' : near ? 'text-amber-600' : 'text-gray-400'
      )}
    >
      {length}/{limit}
      {over && ' — Google will cut this off'}
    </span>
  )
}

export const inputClass =
  'w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm text-forest transition-colors placeholder:text-gray-400 hover:border-emerald/30 focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20 disabled:cursor-not-allowed disabled:bg-cream/60'

export const fileInputClass =
  'w-full cursor-pointer rounded-xl border border-dashed border-mist bg-cream/40 px-3.5 py-2.5 text-sm text-gray-500 transition-colors hover:border-saffron/60 hover:bg-saffron/[0.04] focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-forest file:shadow-soft'

export const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-saffron px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-saffron-dark hover:shadow-card focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50'
