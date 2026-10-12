import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse, after } from 'next/server'
import { getAllArticles, getArticleBySlug } from '@/lib/articles'
import { clientIdFromHeaders } from '@/lib/admin-auth.js'
import { ASK_ENABLED } from '@/lib/site-config'
import { buildAskDocuments } from '@/lib/ask/documents'
import { checkQuestion, createRateLimiter } from '@/lib/ask/limits'
import { buildSystemPrompt } from '@/lib/ask/prompt'
import { collectSources, isAnswered, needsImmigrationNote } from '@/lib/ask/sources'
import type { AskStreamEvent } from '@/lib/ask/events'
import { scrubQuestion } from '@/lib/ask/models'
import { insightsEnabled, saveQuestion } from '@/lib/ask/store'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Ask Saffron Isle: one question in, a streamed answer out.
 *
 * The response is newline-delimited JSON — `text` events as the answer is
 * written, then a single `meta` event with the cited articles — rather than
 * server-sent events, because the client is a plain fetch reader and has no
 * use for SSE's reconnect machinery on a one-shot answer.
 *
 * When insights are configured, the question is saved after the response has
 * finished — redacted first, never the original — so logging can never slow
 * an answer down or break one.
 */

/**
 * Haiku, not Opus: answers come from a small fixed corpus with citations, and
 * at about 1/40th of the cost per question a demo-sized budget lasts for
 * thousands of questions rather than dozens. Opus is the upgrade if answers
 * ever need more care — change this line and restore the server-side
 * `fallbacks` option, which Haiku does not support.
 */
const MODEL = 'claude-haiku-5-5'

const takeToken = createRateLimiter()

/** Built once per instance: the corpus only changes on deploy. */
let corpus: (ReturnType<typeof buildAskDocuments> & { system: string }) | null = null
function getCorpus() {
  if (!corpus) {
    const articles = getAllArticles().map((meta) => {
      const article = getArticleBySlug(meta.slug)
      return { slug: meta.slug, title: meta.title, category: meta.category, content: article?.content ?? '' }
    })
    const built = buildAskDocuments(articles)
    corpus = { ...built, system: buildSystemPrompt(built.documents.map((d) => d.category)) }
  }
  return corpus
}

const MESSAGES = {
  unavailable: "Ask Saffron Isle isn't available right now. You can still search the articles.",
  busy: 'Lots of people are asking right now. Please try again in a minute.',
  failed: "Something went wrong while answering. Please try again, or search the articles instead.",
  refused: "Sorry — I can't help with that one. Try asking about life in Ireland, or browse the articles.",
}

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers })

export async function POST(req: NextRequest) {
  if (!ASK_ENABLED || !process.env.ANTHROPIC_API_KEY) {
    return json({ error: MESSAGES.unavailable }, 503)
  }

  const limit = takeToken(clientIdFromHeaders(req.headers))
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60)
    return json(
      {
        error:
          limit.retryAfterSeconds > 120
            ? `You've asked a lot of questions today. Please come back in about ${Math.ceil(minutes / 60)} hour(s), or search the articles.`
            : 'You’re asking quickly — please wait a minute and try again.',
      },
      429,
      { 'Retry-After': String(limit.retryAfterSeconds) }
    )
  }

  let body: { question?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Type a question to ask.' }, 400)
  }
  const checked = checkQuestion(body.question)
  if (!checked.ok) return json({ error: checked.error }, 400)
  const { question } = checked

  const { documents, blocks, system } = getCorpus()

  // Resolved with what to log once the answer is complete; null if there is
  // nothing worth logging (an error, a refusal).
  let settle: (outcome: { answered: boolean; sources: string[] } | null) => void = () => {}
  const outcome = new Promise<{ answered: boolean; sources: string[] } | null>((resolve) => (settle = resolve))
  if (insightsEnabled()) {
    after(async () => {
      const result = await outcome
      if (!result) return
      try {
        await saveQuestion({ q: await scrubQuestion(question), ...result })
      } catch (error) {
        console.error('[ask] could not save question', error)
      }
    })
  }
  const client = new Anthropic()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: 2000,
          // Chat answers from a fixed corpus: low effort keeps latency and
          // cost down without hurting quality on this kind of lookup.
          output_config: { effort: 'low' },
          system,
          messages: [
            {
              role: 'user',
              content: [...blocks, { type: 'text', text: question }],
            },
          ],
        })

        const citations: { document_index?: number }[] = []
        let answer = ''
        for await (const event of response) {
          if (event.type !== 'content_block_delta') continue
          if (event.delta.type === 'text_delta') {
            answer += event.delta.text
            send({ type: 'text', text: event.delta.text })
          } else if (event.delta.type === 'citations_delta') {
            citations.push(event.delta.citation as { document_index?: number })
          }
        }

        const final = await response.finalMessage()
        if (final.stop_reason === 'refusal') {
          // Whatever streamed before the refusal is not an answer.
          send({ type: 'error', message: MESSAGES.refused, discardText: true })
          return
        }

        const sources = collectSources(citations, documents)
        const answered = isAnswered(answer, sources)
        settle({ answered, sources: sources.map((s) => s.slug) })
        send({
          type: 'meta',
          sources,
          answered,
          immigrationNote: needsImmigrationNote(question, sources),
          truncated: final.stop_reason === 'max_tokens',
        })
      } catch (error) {
        // Upstream error text never reaches the browser — it can name the
        // provider, the model or the account, and helps no reader.
        if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
          send({ type: 'error', message: MESSAGES.busy })
        } else {
          if (error instanceof Anthropic.APIError) {
            console.error('[ask] Anthropic API error', error.status)
          } else {
            console.error('[ask] stream failed', error)
          }
          send({ type: 'error', message: MESSAGES.failed })
        }
      } finally {
        settle(null) // no-op if already settled with a result
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
