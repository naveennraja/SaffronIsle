import type { ReactNode } from 'react'

type AdminShellProps = {
  children: ReactNode
  maxWidth?: 'sm' | 'lg'
}

const widthClass = {
  sm: 'max-w-sm',
  lg: 'max-w-lg',
} as const

export default function AdminShell({ children, maxWidth = 'lg' }: AdminShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className={`w-full ${widthClass[maxWidth]} rounded-2xl border border-mist/60 bg-white p-8 shadow-soft`}>
        {children}
      </div>
    </div>
  )
}
