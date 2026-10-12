import { createHash, randomUUID, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { planGrouping } from '@/lib/ask/insights'
import { assignTopics } from '@/lib/ask/models'
import { applyPlan, insightsEnabled, loadPending, loadTopics } from '@/lib/ask/store'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Daily: groups the questions asked since the last run into topics.
 *
 * Triggered by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer
 * token. Safe to run twice — a question that already has a topic is never
 * counted again — and a batch the model fumbles simply stays pending for the
 * next run.
 */

const BATCH = 80
const MAX_BATCHES = 10

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = req.headers.get('authorization') ?? ''
  const digest = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`))
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!insightsEnabled() || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: 'not configured' })
  }

  let grouped = 0
  let retried = 0
  let expired = 0
  for (let i = 0; i < MAX_BATCHES; i++) {
    const pending = await loadPending(BATCH)
    if (pending.questions.length === 0 && pending.expired.length === 0) break

    const topics = await loadTopics()
    const toGroup = pending.questions.filter((q) => !q.topicId)
    const assignments = toGroup.length ? await assignTopics(toGroup, topics) : []
    if (assignments === null) {
      retried += toGroup.length
      break
    }

    const plan = planGrouping(pending.questions, topics, assignments, randomUUID)
    await applyPlan(plan, pending.questions, pending.expired)
    grouped += plan.grouped.length
    retried += plan.retry.length
    expired += pending.expired.length

    // Everything in this batch came back for retry: stop rather than loop on it.
    if (plan.done.length === 0 && pending.expired.length === 0) break
  }

  return NextResponse.json({ ok: true, grouped, retried, expired })
}
