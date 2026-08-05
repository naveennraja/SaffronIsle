'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

interface ChecklistItemProps {
  id: string
  children: React.ReactNode
}

/**
 * Tiny external store over localStorage.
 *
 * useSyncExternalStore is the supported way to read from something outside
 * React. Reading in an effect instead renders unchecked first and corrects
 * itself a frame later, which shows as a visible flicker on a ticked item —
 * and React Compiler flags the setState-in-effect that requires.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // Keeps two tabs of the same checklist in agreement.
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readChecked(id: string): boolean {
  try {
    return localStorage.getItem(`checklist-${id}`) === 'true'
  } catch {
    // Private browsing or storage disabled — treat as unchecked.
    return false
  }
}

function writeChecked(id: string, value: boolean) {
  try {
    localStorage.setItem(`checklist-${id}`, String(value))
  } catch {
    // Ignore: the checkbox still toggles for this session.
  }
  listeners.forEach((notify) => notify())
}

export function ChecklistItem({ id, children }: ChecklistItemProps) {
  const getSnapshot = useCallback(() => readChecked(id), [id])
  // Nothing is checked on the server, which matches the pre-hydration HTML.
  const getServerSnapshot = useCallback(() => false, [])

  const checked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

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
        onChange={() => writeChecked(id, !checked)}
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
