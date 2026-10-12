'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUESTION_MAX } from '@/lib/ask/limits'
import { parseInline } from '@/lib/ask/format'
import type { AskStreamEvent } from '@/lib/ask/events'
import type { AskSource } from '@/lib/ask/sources'

/**
 * The Ask Saffron Isle chat panel: a full-screen sheet on phones, a side panel
 * from md up.
 *
 * Each question is answered independently — there is no conversation memory
 * on the server — so earlier exchanges stay on screen for the reader's
 * benefit only.
 */

const STARTERS = [
  'How do I renew my IRP?',
  'Where can I buy Indian groceries in Dublin?',
  'What do I need to do after graduating?',
]

const IMMIGRATION_URL = 'https://www.irishimmigration.ie/'

interface Exchange {
  id: number
  question: string
  answer: string
  status: 'streaming' | 'done' | 'error'
  error?: string
  sources: AskSource[]
  answered: boolean
  immigrationNote: boolean
  truncated: boolean
}

interface AskPanelProps {
  open: boolean
  onClose: () => void
  savesQuestions: boolean
}

export default function AskPanel({ open, onClose, savesQuestions }: AskPanelProps) {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  const busy = exchanges.some((e) => e.status === 'streaming')

  // While open, everything outside the panel is inert: unreachable by Tab and
  // hidden from screen readers. That is the focus trap — the same mechanism the
  // mobile menu uses — without hand-rolled keydown bookkeeping.
  useEffect(() => {
    if (!open) return
    const outside = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.hasAttribute('data-ask-root') && !el.inert
    )
    outside.forEach((el) => (el.inert = true))
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      outside.forEach((el) => (el.inert = false))
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [exchanges])

  function update(id: number, patch: (e: Exchange) => Partial<Exchange>) {
    setExchanges((all) => all.map((e) => (e.id === id ? { ...e, ...patch(e) } : e)))
  }

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    const id = nextId.current++
    setDraft('')
    setExchanges((all) => [
      ...all,
      {
        id,
        question: q,
        answer: '',
        status: 'streaming',
        sources: [],
        answered: false,
        immigrationNote: false,
        truncated: false,
      },
    ])

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        update(id, () => ({
          status: 'error',
          error: data.error ?? 'Something went wrong. Please try again.',
        }))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as AskStreamEvent
          if (event.type === 'text') {
            update(id, (e) => ({ answer: e.answer + event.text }))
          } else if (event.type === 'meta') {
            finished = true
            update(id, () => ({
              status: 'done',
              sources: event.sources,
              answered: event.answered,
              immigrationNote: event.immigrationNote,
              truncated: event.truncated,
            }))
          } else if (event.type === 'error') {
            finished = true
            update(id, (e) => ({
              status: 'error',
              error: event.message,
              answer: event.discardText ? '' : e.answer,
            }))
          }
        }
      }

      if (!finished) {
        update(id, () => ({
          status: 'error',
          error: 'The answer was cut off. Please try again.',
        }))
      }
    } catch {
      update(id, () => ({
        status: 'error',
        error: "Couldn't reach Saffron Isle. Check your connection and try again.",
      }))
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    ask(draft)
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] hidden bg-forest/40 backdrop-blur-sm transition-opacity md:block',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-title"
        inert={!open}
        className={cn(
          'fixed inset-0 z-[60] flex flex-col bg-cream shadow-xl transition-transform duration-300 md:left-auto md:w-[420px]',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex min-h-[56px] items-center justify-between border-b border-mist bg-white px-4">
          <div>
            <h2 id="ask-title" className="font-serif text-lg font-semibold text-forest">
              Ask Saffron Isle
            </h2>
            <p className="text-xs text-gray-600">Answers from Nethra&apos;s guides</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-forest hover:bg-mist"
            aria-label="Close Ask Saffron Isle"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {exchanges.length === 0 && (
            <div>
              <p className="mb-4 text-body text-gray-800">
                Ask anything about moving to or living in Ireland. Answers come
                only from Saffron Isle&apos;s articles, with links so you can read
                more.
              </p>
              <p className="mb-2 text-label font-semibold uppercase tracking-widest text-saffron-dark">
                Try asking
              </p>
              <ul className="space-y-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => ask(s)}
                      className="min-h-[44px] w-full rounded-xl bg-white px-4 py-2 text-left text-small text-forest shadow-soft ring-1 ring-mist hover:ring-emerald/30"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {exchanges.map((e) => (
            <ExchangeView key={e.id} exchange={e} />
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="border-t border-mist bg-white px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <label htmlFor="ask-input" className="sr-only">
            Your question
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="ask-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ask(draft)
                }
              }}
              rows={2}
              maxLength={QUESTION_MAX}
              placeholder="e.g. How do I renew my IRP?"
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-mist bg-white px-3.5 py-2.5 text-base text-forest placeholder:text-gray-500 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send question"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald text-white transition-colors hover:bg-emerald-dark disabled:opacity-50"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            Answers come only from Saffron Isle&apos;s articles and may not cover
            your situation.{' '}
            {savesQuestions
              ? 'Questions are saved anonymously to help us improve the guide.'
              : 'Questions aren\u2019t stored.'}{' '}
            <Link href="/privacy" className="text-emerald-dark underline">
              Privacy
            </Link>
          </p>
        </form>
      </div>
    </>
  )
}

function ExchangeView({ exchange: e }: { exchange: Exchange }) {
  return (
    <div className="space-y-3">
      <p className="ml-8 rounded-2xl rounded-br-md bg-emerald px-4 py-2.5 text-small text-white">
        <span className="sr-only">You asked: </span>
        {e.question}
      </p>

      <div
        className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-small leading-relaxed text-gray-800 shadow-soft"
        aria-live="polite"
        aria-busy={e.status === 'streaming'}
      >
        {e.answer && <AnswerText text={e.answer} />}
        {e.status === 'streaming' && !e.answer && (
          <p className="text-gray-600">Reading the guides…</p>
        )}
        {e.truncated && (
          <p className="mt-2 text-gray-600">That answer was cut short — the articles below have the full detail.</p>
        )}
        {e.status === 'error' && <p className="text-saffron-dark">{e.error}</p>}

        {e.status === 'done' && e.sources.length > 0 && (
          <div className="mt-3 border-t border-mist pt-3">
            <p className="mb-1.5 text-xs font-semibold text-gray-600">From these articles</p>
            <ul className="space-y-1">
              {e.sources.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/articles/${s.slug}`}
                    className="text-emerald-dark underline decoration-emerald/30 underline-offset-2 hover:decoration-emerald"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {e.status === 'done' && !e.answered && (
          <p className="mt-3 border-t border-mist pt-3 text-xs text-gray-600">
            Not covered yet?{' '}
            <Link href="/search" className="text-emerald-dark underline">
              Search all articles
            </Link>
          </p>
        )}

        {e.status === 'done' && e.immigrationNote && (
          <p className="mt-3 rounded-lg bg-saffron/10 px-3 py-2 text-xs text-forest">
            Immigration rules change. Always check the official{' '}
            <a
              href={IMMIGRATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-forest underline"
            >
              Immigration Service Delivery website
            </a>{' '}
            before you act.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Renders the model's answer: paragraphs, bulleted and numbered lists,
 * **bold** and links to the site's own pages (lib/ask/format.ts). Built from
 * React elements, never injected HTML, so nothing the model writes can become
 * markup.
 */
function AnswerText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim())
        const bullets = lines.every((l) => /^\s*[-*•]\s+/.test(l))
        const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l))
        if (lines.length > 0 && (bullets || numbered)) {
          const items = lines.map((l) => l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
          const ListTag = numbered ? 'ol' : 'ul'
          return (
            <ListTag key={i} className={cn('space-y-1 pl-5', numbered ? 'list-decimal' : 'list-disc')}>
              {items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ListTag>
          )
        }
        return <p key={i}>{inline(lines.join(' '))}</p>
      })}
    </div>
  )
}

function inline(text: string): ReactNode[] {
  return parseInline(text).map((token, i) => {
    if (token.type === 'bold') {
      return (
        <strong key={i} className="font-semibold text-forest">
          {token.text}
        </strong>
      )
    }
    if (token.type === 'link') {
      return (
        <Link
          key={i}
          href={token.href}
          className="text-emerald-dark underline decoration-emerald/30 underline-offset-2 hover:decoration-emerald"
        >
          {token.text}
        </Link>
      )
    }
    return token.text
  })
}
