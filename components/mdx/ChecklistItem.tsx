'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ChecklistItemProps {
  id: string
  children: React.ReactNode
}

export function ChecklistItem({ id, children }: ChecklistItemProps) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`checklist-${id}`)
    if (stored === 'true') setChecked(true)
  }, [id])

  function toggle() {
    const next = !checked
    setChecked(next)
    localStorage.setItem(`checklist-${id}`, String(next))
  }

  return (
    <label
      className={cn(
        'my-2 flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-lg border border-mist p-3 transition-colors hover:bg-cream',
        checked && 'bg-emerald/5'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        className="mt-1 h-5 w-5 shrink-0 accent-emerald"
        aria-describedby={`checklist-label-${id}`}
      />
      <span
        id={`checklist-label-${id}`}
        className={cn('text-body', checked && 'text-gray-500 line-through')}
      >
        {children}
      </span>
    </label>
  )
}
