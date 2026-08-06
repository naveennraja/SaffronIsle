import type { ReactNode } from 'react'

type AdminShellProps = {
  children: ReactNode
  /** 'sm' for the password gate, 'xl' for the two-column publish form. */
  maxWidth?: 'sm' | 'lg' | 'xl'
}

const widthClass = {
  sm: 'max-w-sm',
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
} as const

export default function AdminShell({ children, maxWidth = 'lg' }: AdminShellProps) {
  return (
    // items-start rather than items-center: the publish form is taller than the
    // viewport once both columns are filled, and centring would push its heading
    // off the top of the screen.
    <div
      className={`flex min-h-screen justify-center bg-cream px-4 py-10 ${
        maxWidth === 'xl' ? 'items-start' : 'items-center'
      }`}
    >
      <div className={`w-full ${widthClass[maxWidth]}`}>{children}</div>
    </div>
  )
}

/** One titled card. The publish form is a grid of these. */
export function AdminSection({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-mist/60 bg-white p-6 shadow-soft ${className}`}
    >
      <h2 className="mb-4 border-b border-mist/60 pb-3 font-serif text-lg text-forest">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

/** Label, control and optional hint, so every field lines up the same way. */
export function AdminField({
  label,
  hint,
  optional,
  required,
  children,
}: {
  label: string
  hint?: ReactNode
  optional?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-forest">
        {label}
        {required && <span className="text-red-400"> *</span>}
        {optional && <span className="text-gray-400"> ({optional})</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-mist px-4 py-2.5 text-sm focus:border-saffron focus:outline-none'

export const fileInputClass =
  'w-full rounded-lg border border-mist px-4 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-saffron/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-saffron-dark focus:outline-none'
