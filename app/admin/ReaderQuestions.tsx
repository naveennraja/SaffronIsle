'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, HelpCircle, Loader2, TrendingUp } from 'lucide-react'
import AdminShell, { AdminSection, AdminTopBar } from './AdminShell'
import type { InsightsView } from '@/lib/ask/store'

/**
 * What readers asked Ask Saffron Isle, for the person who writes the answers.
 *
 * Two lists: what came up most this week, and what the articles couldn't
 * answer — the second is the useful one, because it is a list of articles
 * readers are already waiting for. "Written it" takes a topic off that list;
 * it comes back on its own if readers keep asking and the new article still
 * doesn't answer them.
 */

type Load =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; data: InsightsView }

export default function ReaderQuestions({ topBarActions }: { topBarActions: ReactNode }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [dismissing, setDismissing] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/insights', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Could not load reader questions.')
      setLoad({ state: 'ready', data })
    } catch (error) {
      setLoad({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not load reader questions.',
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/insights', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.ok) {
          setLoad({ state: 'error', message: data.error ?? 'Could not load reader questions.' })
        } else {
          setLoad({ state: 'ready', data })
        }
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: 'error', message: 'Could not load reader questions.' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function markWritten(topicId: string) {
    setDismissing(topicId)
    try {
      await fetch('/api/admin/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissTopic: topicId }),
      })
      await refresh()
    } finally {
      setDismissing(null)
    }
  }

  return (
    <AdminShell maxWidth="xl" topBar={<AdminTopBar>{topBarActions}</AdminTopBar>}>
      <header className="mb-6">
        <h1 className="font-serif text-2xl text-forest sm:text-h1">Reader questions</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          What readers asked Ask Saffron Isle. Questions are grouped into topics
          once a day, with personal details removed, and deleted after 90 days.
        </p>
      </header>

      {load.state === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      )}

      {load.state === 'error' && (
        <p className="rounded-xl bg-saffron/10 px-4 py-3 text-sm text-forest">{load.message}</p>
      )}

      {load.state === 'ready' && !load.data.enabled && (
        <AdminSection title="Not switched on yet" icon={<HelpCircle className="h-5 w-5" aria-hidden />}>
          <p className="text-sm text-gray-600">
            Reader questions appear here once question saving is connected. Until
            then, readers can still use Ask Saffron Isle — nothing is saved.
          </p>
        </AdminSection>
      )}

      {load.state === 'ready' && load.data.enabled && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminSection
            title="Questions we couldn't answer"
            description="Topics readers asked about that no article covers yet — your next articles. Mark one as written once its article is live."
            icon={<HelpCircle className="h-5 w-5" aria-hidden />}
            className="lg:col-span-2"
          >
            {load.data.unanswered.length === 0 ? (
              <p className="text-sm text-gray-600">Nothing waiting — the articles answered everything asked so far.</p>
            ) : (
              <ul className="divide-y divide-mist">
                {load.data.unanswered.map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-forest">{t.label}</p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {t.openUnanswered} unanswered {t.openUnanswered === 1 ? 'question' : 'questions'}
                        {t.asked > t.openUnanswered && ` · ${t.asked} asked in total`}
                      </p>
                      {t.examples.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {t.examples.map((ex, i) => (
                            <li key={i} className="text-sm italic text-gray-600">
                              “{ex}”
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => markWritten(t.id)}
                      disabled={dismissing === t.id}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-mist bg-white px-3.5 text-sm font-medium text-forest transition-colors hover:border-emerald/40 hover:bg-emerald-light/40 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald" aria-hidden />
                      Written it — remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          <AdminSection
            title="Most asked this week"
            description={`Week ${load.data.week.split('-W')[1]}. Includes questions the articles did answer.`}
            icon={<TrendingUp className="h-5 w-5" aria-hidden />}
          >
            {load.data.mostAsked.length === 0 ? (
              <p className="text-sm text-gray-600">No grouped questions yet this week.</p>
            ) : (
              <ol className="space-y-2">
                {load.data.mostAsked.map((t, i) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-forest">
                      <span className="mr-2 text-gray-500">{i + 1}.</span>
                      {t.label}
                    </span>
                    <span className="shrink-0 text-gray-600">
                      {t.asked}
                      {t.unanswered > 0 && <span className="text-saffron-dark"> · {t.unanswered} unanswered</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </AdminSection>

          <AdminSection title="Waiting to be grouped" icon={<Loader2 className="h-5 w-5" aria-hidden />}>
            <p className="text-sm text-gray-600">
              {load.data.pending === 0
                ? 'All questions so far are grouped.'
                : `${load.data.pending} new ${load.data.pending === 1 ? 'question' : 'questions'} will be grouped tonight.`}
            </p>
          </AdminSection>
        </div>
      )}
    </AdminShell>
  )
}
