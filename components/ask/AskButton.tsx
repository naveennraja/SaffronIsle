'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'

/**
 * The floating "Ask" button on every public page.
 *
 * This is the only part of Ask Saffron Isle that every page loads, so it is
 * kept to a button and a flag. The panel — streaming, rendering, focus
 * handling — is a separate chunk fetched on the first click, which keeps the
 * feature from costing anything on pages where nobody asks.
 */
const AskPanel = dynamic(() => import('./AskPanel'), { ssr: false })

/** `savesQuestions`: whether question insights are on, so the panel's notice tells the truth. */
export function AskButton({ savesQuestions }: { savesQuestions: boolean }) {
  const [open, setOpen] = useState(false)
  // Once opened, stay mounted so a closed-and-reopened panel keeps the
  // conversation instead of starting over.
  const [loaded, setLoaded] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Stable, because the panel's open/close effect depends on it.
  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  return (
    <div data-ask-root>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setLoaded(true)
          setOpen(true)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        // Behind the open panel: out of the tab order, but still focusable
        // programmatically so closing the panel can return focus here.
        tabIndex={open ? -1 : undefined}
        className="fixed right-4 z-40 flex min-h-[48px] items-center gap-2 rounded-full bg-emerald px-5 font-medium text-white shadow-card transition-colors hover:bg-emerald-dark"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <MessageCircleQuestion className="h-5 w-5" aria-hidden />
        Ask
      </button>
      {loaded && <AskPanel open={open} onClose={close} savesQuestions={savesQuestions} />}
    </div>
  )
}
