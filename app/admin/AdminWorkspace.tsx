'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import PublishArticleForm from './PublishArticleForm'
import ReaderQuestions from './ReaderQuestions'

/**
 * Everything behind the password: the publish form and the reader-questions
 * view, switched from the top bar. Publish stays the default so the screen
 * Nethra already knows is still the one she lands on.
 */

type Tab = 'publish' | 'questions'

const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'publish', label: 'Publish', short: 'Publish' },
  { id: 'questions', label: 'Reader questions', short: 'Questions' },
]

export default function AdminWorkspace({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('publish')

  const actions = (
    <div className="flex items-center gap-1 sm:gap-2">
      <nav aria-label="Admin sections" className="flex gap-1 rounded-xl bg-mist/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              'min-h-[36px] rounded-lg px-2.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
              tab === t.id ? 'bg-white text-forest shadow-soft' : 'text-gray-600 hover:text-forest'
            )}
          >
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-mist/60 hover:text-forest focus:outline-none focus:ring-2 focus:ring-saffron/30"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  )

  return tab === 'publish' ? (
    <PublishArticleForm topBarActions={actions} />
  ) : (
    <ReaderQuestions topBarActions={actions} />
  )
}
